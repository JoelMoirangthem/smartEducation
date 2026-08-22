"""LLM-composed MongoDB commands.

Instead of fixed bulk signatures, the model translates the user's intention
into its own query/update JSON and executes it here:

  db_find    (read)        – ad-hoc queries: any collection, any filter
  db_insert  (write)       – insert documents the model composed
  db_modify  (destructive) – update_one/many + delete_one/many; the approval
                             card shows the exact command plus a live server-
                             side count of how many documents would be hit.

Safety rails: collection allowlist, op allowlist, no $where/$function JS,
audit-log collection is write-protected, password fields rejected (bcrypt
lives in create_user/bulk_create_users), non-empty filter required for *_many,
24-hex strings under *id keys are auto-cast to ObjectId.
"""

import re
from typing import Any

from registry import agent_tool
from tools.common import fail, ok
import db as database
import realtime

# Every platform collection the agent may touch (mirrors db.py).
COLLECTIONS = {
    "users", "classes", "subjects", "academicyears", "attendancesessions",
    "attendancerecords", "marks", "exams", "notes", "notices", "notifications",
    "chatsessions", "events", "fees", "payments", "librarybooks",
    "libraryissues", "inventories", "transports", "transportassignments",
    "timetables", "parents", "leaves", "facedatas",
}
WRITE_PROTECTED = {"agentactionlogs"}          # append-only audit trail
FORBIDDEN_OPS = {"$where", "$function", "$accumulator", "$jsonSchema"}
MODIFY_OPS = {"update_one", "update_many", "delete_one", "delete_many"}
UPD_OPERATORS = ("$set", "$unset", "$inc", "$push", "$pull", "$addToSet",
                 "$pullAll", "$setOnInsert")

_OID_RE = re.compile(r"^[0-9a-fA-F]{24}$")


def _coll(name: str):
    """Return a Motor collection if allowed, else None."""
    return database.db()[name] if name in COLLECTIONS else None


def _is_id_key(key: str | None) -> bool:
    if not key:
        return False
    k = key.lower()
    return k == "_id" or k.endswith("id") or k.endswith("ids")


def _cast_ids(node: Any, key: str | None = None) -> Any:
    """Recursively turn 24-hex strings under id-ish keys into ObjectIds.

    Operator dicts ($in/$nin/$all/$eq/$elemMatch/...) inherit the PARENT key,
    so {"_id": {"$in": ["6a88…"]}} casts its elements too.
    """
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            effective = key if isinstance(k, str) and k.startswith("$") else k
            out[k] = _cast_ids(v, effective)
        return out
    if isinstance(node, list):
        return [_cast_ids(x, key) for x in node]
    if key and _is_id_key(key) and isinstance(node, str) and _OID_RE.match(node):
        return database.oid(node) or node
    return node


def _scan_forbidden(node: Any) -> str | None:
    """Return the first forbidden operator found anywhere in the structure."""
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(k, str) and k in FORBIDDEN_OPS:
                return k
            hit = _scan_forbidden(v)
            if hit:
                return hit
    elif isinstance(node, list):
        for x in node:
            hit = _scan_forbidden(x)
            if hit:
                return hit
    return None


def _contains_password(node: Any) -> bool:
    if isinstance(node, dict):
        return any(isinstance(k, str) and "password" in k.lower() for k in node) \
            or any(_contains_password(v) for v in node.values())
    if isinstance(node, list):
        return any(_contains_password(x) for x in node)
    return False


def _validate_filter(flt: Any, many: bool) -> str | None:
    if flt is None:
        flt = {}
    if not isinstance(flt, dict):
        return "filter must be a JSON object"
    bad = _scan_forbidden(flt)
    if bad:
        return f"operator {bad} is not allowed"
    if many and not flt:
        return "a non-empty filter is required for *_many operations"


def _validate_update(upd: Any) -> str | None:
    if not isinstance(upd, dict) or not upd:
        return "update must be a non-empty JSON object using operators like $set"
    if not any(k in UPD_OPERATORS for k in upd):
        return "update must use an operator ($set, $unset, $push, $pull, ...)"
    if _contains_password(upd):
        return "password fields cannot be set via raw commands (use create_user / bulk_create_users)"
    bad = _scan_forbidden(upd)
    if bad:
        return f"operator {bad} is not allowed"
    return None


def _preview_label(op: str) -> str:
    return "would match" if op.endswith("_many") else "first match of"


async def _modify_preview(params: dict) -> str:
    """Server-side dry run shown ON the approval card before the decision."""
    coll = _coll(str(params.get("collection", "")))
    op = str(params.get("op", ""))
    if coll is None or op not in MODIFY_OPS:
        return ""
    try:
        n = await coll.count_documents(_cast_ids(params.get("filter") or {}))
    except Exception:
        return ""
    return f"{op} {_preview_label(op)} {n} document(s)"


@agent_tool(
    name="db_find", label="DB query", severity="read", roles=["admin"], domain="admin",
    description="Run your own MongoDB find against any platform collection. Args: "
                "collection, filter?{}, sort?{field:1|-1}, limit?(default 20, max 200), "
                "projection?{}. Compose the filter yourself from the user's intent.",
)
async def db_find(collection: str, filter: dict | None = None,
                  sort: dict | None = None, limit: int = 20,
                  projection: dict | None = None) -> dict:
    coll = _coll(collection)
    if coll is None:
        return fail(f"Unknown collection '{collection}'")
    err = _validate_filter(filter or {}, many=False)
    if err:
        return fail(err)
    limit = max(1, min(int(limit or 20), 200))
    q = _cast_ids(filter or {})
    cur = coll.find(q, projection or {})
    if sort:
        cur = cur.sort([(k, int(v)) for k, v in sort.items()])
    docs = [database.serialize(d) async for d in cur.limit(limit)]
    total = await coll.count_documents(q)
    note = f"showing {len(docs)} of {total}" if total > len(docs) else f"{len(docs)} matched"
    return ok(f"{collection}: {note}", {"total": total, "docs": docs})


@agent_tool(
    name="db_insert", label="DB insert", severity="write", roles=["admin"], domain="admin",
    description="Insert documents you composed into a platform collection. Args: "
                "collection, documents [{}]. Passwords are not accepted here — "
                "use create_user/bulk_create_users for accounts.",
)
async def db_insert(collection: str, documents: list[dict]) -> dict:
    coll = _coll(collection)
    if coll is None:
        return fail(f"Unknown collection '{collection}'")
    if collection in WRITE_PROTECTED:
        return fail(f"Collection '{collection}' is write-protected")
    if not documents or not isinstance(documents, list):
        return fail("documents must be a non-empty array")
    if _contains_password(documents):
        return fail("password fields cannot be inserted via raw commands")
    bad = _scan_forbidden(documents)
    if bad:
        return fail(f"operator {bad} is not allowed")
    res = await coll.insert_many([_cast_ids(d) for d in documents])
    await realtime.emit("AGENT_DB_WRITE", {"collection": collection, "inserted": len(res.inserted_ids)},
                        broadcast=True)
    return ok(f"Inserted {len(res.inserted_ids)} document(s) into {collection}",
              {"ids": [str(i) for i in res.inserted_ids]})


@agent_tool(
    name="db_modify", label="DB modify", severity="destructive", roles=["admin"], domain="admin",
    description="Execute YOUR OWN update/delete command: op ∈ update_one|update_many|"
                "delete_one|delete_many. Args: collection, op, filter{}, update?{} "
                "(with $set etc., for update_*). The user sees the exact command and "
                "how many documents it matches before approving. Prefer domain tools "
                "(delete_user, bulk_delete_users...) when one fits the intent.",
    preview=_modify_preview,
)
async def db_modify(collection: str, op: str, filter: dict | None = None,
                    update: dict | None = None) -> dict:
    coll = _coll(collection)
    if coll is None:
        return fail(f"Unknown collection '{collection}'")
    if collection in WRITE_PROTECTED:
        return fail(f"Collection '{collection}' is write-protected")
    if op not in MODIFY_OPS:
        return fail(f"op must be one of {sorted(MODIFY_OPS)}")
    many = op.endswith("_many")
    flt = filter or {}
    err = _validate_filter(flt, many=many)
    if err:
        return fail(err)
    flt = _cast_ids(flt)

    if op.startswith("update_"):
        err = _validate_update(update)
        if err:
            return fail(err)
        res = await coll.update_many(flt, update) if many else await coll.update_one(flt, update)
        if res.matched_count == 0:
            return {"ok": False,
                    "summary": f"{collection}.{op}: matched 0 documents — NOTHING was changed. "
                               "Verify the filter (field names, id format) and retry.",
                    "error": "matched 0 documents", "data": {"matched": 0}}
        out = {"matched": res.matched_count, "modified": res.modified_count}
        summary = f"{collection}.{op}: matched {res.matched_count}, modified {res.modified_count}"
    else:
        res = await coll.delete_many(flt) if many else await coll.delete_one(flt)
        if res.deleted_count == 0:
            return {"ok": False,
                    "summary": f"{collection}.{op}: deleted 0 documents — the filter matched nothing. "
                               "Verify it and retry.",
                    "error": "deleted 0 documents", "data": {"deleted": 0}}
        out = {"deleted": res.deleted_count}
        summary = f"{collection}.{op}: deleted {res.deleted_count}"

    await realtime.emit("AGENT_DB_WRITE", {"collection": collection, "op": op, **out},
                        broadcast=True)
    return ok(summary, out)
