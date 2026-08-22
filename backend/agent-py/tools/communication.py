"""Communication domain: notices, notifications and events (port of notice/notification/event controllers)."""

from datetime import datetime, timedelta, timezone
from typing import Any

import db as database
import realtime
from registry import agent_tool
from tools.common import fail, find_user, me, my_role, now, ok, s


# ── notices ──────────────────────────────────────────────────────────────────

async def _visibility_query(role: str, user_id: str) -> dict:
    """Port of buildVisibilityQuery — what a user may see."""
    query: dict[str, Any] = {"isActive": True}
    or_: list = [
        {"targetType": "ALL"},
        {"targetType": "ROLE", "targetRole": {"$in": [role, "all"]}},
    ]
    if role == "student":
        u = await database.users().find_one({"_id": database.oid(user_id)}, {"classId": 1})
        if u and u.get("classId"):
            or_.append({"targetType": "CLASS", "classId": u["classId"]})
            or_.append({"targetType": "SUBJECT", "classId": u["classId"]})
    elif role == "teacher":
        u = await database.users().find_one({"_id": database.oid(user_id)},
                                            {"managedClassIds": 1, "assignedSubjectIds": 1})
        managed = (u or {}).get("managedClassIds") or []
        assigned = (u or {}).get("assignedSubjectIds") or []
        or_.append({"createdBy": database.oid(user_id)})
        if managed:
            or_.append({"targetType": "CLASS", "classId": {"$in": managed}})
        if assigned:
            or_.append({"targetType": "SUBJECT", "subjectId": {"$in": assigned}})
            subjects = [d async for d in database.subjects().find({"_id": {"$in": assigned}}, {"classId": 1})]
            sub_classes = [x["classId"] for x in subjects if x.get("classId")]
            if sub_classes:
                or_.append({"targetType": "CLASS", "classId": {"$in": sub_classes}})
    # admin: everything
    if role != "admin":
        query["$or"] = or_
    return query


@agent_tool(name="list_notices", label="Notices",
            description="List notices visible to the user, newest first. Optional page/limit. "
                        "Admins: include_inactive=true also returns soft-deleted notices (isActive false) — "
                        "useful when a notice can't be found but the user insists it exists.",
            domain="communication")
async def list_notices(page: int = 1, limit: int = 10, include_inactive: bool = False) -> dict:
    limit = max(1, min(int(limit), 50))
    page = max(1, int(page))
    q = await _visibility_query(my_role(), me())
    if my_role() == "admin" and include_inactive:
        q.pop("isActive", None)  # admins may audit soft-deleted notices too
    total = await database.notices().count_documents(q)
    docs = []
    async for d in database.notices().find(q).sort("createdAt", -1).skip((page - 1) * limit).limit(limit):
        d = database.serialize(d)
        d["createdBy_"] = await find_user(d.pop("createdBy", None), {"name": 1, "email": 1})
        docs.append(d)
    return ok(f"{len(docs)} of {total} notices", {"notices": docs, "page": page,
                                                  "totalPages": (total + limit - 1) // limit, "total": total})


async def _notice_recipients(target: str, target_role: str, class_id, subject_id, creator_oid) -> list:
    """Port of recipient gathering (always excludes the creator)."""
    base: dict[str, Any] = {}
    if target == "ROLE" and target_role and target_role != "all":
        base["role"] = target_role.lower()
    elif target == "CLASS" and class_id:
        base["classId"] = class_id
    elif target == "SUBJECT" and subject_id:
        subj = await database.subjects().find_one({"_id": database.oid(subject_id)}, {"classId": 1}) or {}
        if subj.get("classId"):
            base["classId"] = subj["classId"]
    ids = [u["_id"] async for u in database.users().find({**base, "_id": {"$ne": creator_oid}}, {"_id": 1})]
    return ids


@agent_tool(name="create_notice", label="Create notice", severity="write", domain="communication",
            description="Create a notice targeted to ALL, a ROLE, a CLASS or a SUBJECT "
                        "(teachers: only classes/subjects they are assigned to). Args: title, content, "
                        "targetType(ALL|CLASS|SUBJECT|ROLE), targetRole?, classId?, subjectId?, priority?(low|medium|high).")
async def create_notice(title: str, content: str, target_type: str = "ALL", target_role: str = "",
                        class_id: str = "", subject_id: str = "", priority: str = "medium") -> dict:
    ctx_role = my_role()
    if ctx_role not in ("teacher", "admin"):
        return fail("Only teachers and administrators can create notices.")
    if not title or not content:
        return fail("Title and content are required.")
    t = (target_type or "ALL").upper()
    if t not in ("ALL", "CLASS", "SUBJECT", "ROLE"):
        return fail("Invalid targetType. Use ALL, CLASS, SUBJECT or ROLE.")
    class_oid = database.oid(class_id)
    subject_oid = database.oid(subject_id)
    if t == "CLASS" and not class_oid:
        t = "ALL"
    if t == "SUBJECT" and not subject_oid:
        t = "ALL"
    if t == "ROLE" and not target_role:
        t = "ALL"

    creator_oid = database.oid(me())
    if t == "CLASS" and ctx_role != "admin":
        direct = await database.users().count_documents({"_id": creator_oid, "classId": class_oid})
        via_subject = await database.subjects().count_documents(
            {"classId": class_oid, "teachers": creator_oid})
        primary = await database.classes().count_documents(
            {"_id": class_oid, "classTeacher": creator_oid})
        if not direct and not via_subject and not primary:
            return fail("You are not assigned to this class. Ask an admin to assign you.")
    if t == "SUBJECT" and ctx_role != "admin":
        if not await database.subjects().count_documents({"_id": subject_oid, "teachers": creator_oid}):
            return fail("You do not teach this subject.")

    doc = {
        "title": title, "content": content, "targetType": t,
        "targetRole": target_role.lower() if t == "ROLE" else "all",
        "createdBy": creator_oid, "priority": priority or "medium", "isActive": True,
    }
    if class_oid:
        doc["classId"] = class_oid
    if subject_oid:
        doc["subjectId"] = subject_oid
    res = await database.notices().insert_one(doc)
    notice = database.serialize(await database.notices().find_one({"_id": res.inserted_id}))
    notice["createdBy_"] = await find_user(notice.get("createdBy"), {"name": 1, "email": 1})

    recipients = await _notice_recipients(t, doc["targetRole"], class_oid, subject_oid, creator_oid)
    room = None
    broadcast = False
    if t == "CLASS" and class_oid:
        room = f"class:{class_oid}"
    elif t == "ALL":
        broadcast = True
    elif t == "ROLE" and doc["targetRole"]:
        room = f"role:{doc['targetRole']}"
    await realtime.emit("notice_created", notice, room=room, broadcast=broadcast)

    if recipients:
        notes = [{"userId": uid, "type": "notice", "message": title,
                  "metadata": {"noticeId": res.inserted_id, "priority": doc["priority"],
                               "content": content, "createdBy": (notice.get("createdBy_") or {}).get("name", "")}}
                 for uid in recipients]
        inserted = await database.notifications().insert_many(notes)
        for i, uid in enumerate(recipients):
            await realtime.emit("new_notification", database.serialize(
                {**notes[i], "_id": inserted.inserted_ids[i], "isRead": False,
                 "createdAt": now().isoformat()}), room=f"user:{uid}")
    return ok(f"Notice '{title}' created ({len(recipients)} recipients notified)",
              {"id": str(res.inserted_id), "targetedCount": len(recipients)})


@agent_tool(name="update_notice", label="Update notice", severity="write", domain="communication",
            description="Update a notice: title/content/priority. Args: id, title?, content?, priority?. "
                        "When correcting a FACT (time, date, venue, name), pass BOTH the corrected title AND "
                        "corrected content if that fact appears in them — headlines usually repeat it.")
async def update_notice(id: str, title: str = "", content: str = "", priority: str = "") -> dict:
    n = await database.notices().find_one({"_id": database.oid(id)})
    if not n:
        return fail("Notice not found")
    if my_role() != "admin" and str(n.get("createdBy")) != me():
        return fail("Not authorized")
    setu: dict[str, Any] = {}
    if title:
        setu["title"] = title
    if content:
        setu["content"] = content
    if priority:
        setu["priority"] = priority
    if not setu:
        return fail("Nothing to change (pass title, content and/or priority)")
    await database.notices().update_one({"_id": n["_id"]}, {"$set": {**setu, "updatedAt": now()}})
    updated = database.serialize(await database.notices().find_one({"_id": n["_id"]}))
    # Echo the FINAL stored values so the model can self-verify its own edit.
    changed = ", ".join(sorted(setu.keys()))
    await realtime.emit("notice_updated", updated)
    return ok(f"Updated {changed}. Final title: '{updated['title']}'. Final content starts: "
              f"'{str(updated.get('content', ''))[:80]}'", {"id": id})


@agent_tool(name="delete_notice", label="Delete notice", severity="destructive", domain="communication",
            description="Delete a notice you created (or any, as admin). Soft delete. Args: id.")
async def delete_notice(id: str) -> dict:
    n = await database.notices().find_one({"_id": database.oid(id)})
    if not n:
        return fail("Notice not found")
    if my_role() != "admin" and str(n.get("createdBy")) != me():
        return fail("Not authorized")
    await database.notices().update_one({"_id": n["_id"]}, {"$set": {"isActive": False}})
    await realtime.emit("notice_deleted", {"id": id})
    return ok(f"Deleted notice '{s(n.get('title'))}'", {"id": id})


# ── notifications ────────────────────────────────────────────────────────────

@agent_tool(name="my_notifications", label="My notifications", domain="communication",
            description="List the user's recent notifications (last 7 days, newest first).")
async def my_notifications() -> dict:
    since = now() - timedelta(days=7)
    docs = [database.serialize(d) async for d in
            database.notifications().find({"userId": database.oid(me()), "createdAt": {"$gte": since}})
            .sort("createdAt", -1)]
    return ok(f"{len(docs)} notifications in the last 7 days", docs)


@agent_tool(name="create_notification", label="Send notification", severity="write", roles=["admin"],
            domain="communication",
            description="Admin: send a notification to a user. Args: recipient (userId), message, type? (info|success|warning|error).")
async def create_notification(recipient: str, message: str, type: str = "info") -> dict:
    if not recipient or not message:
        return fail("recipient and message are required")
    rid = database.oid(recipient)
    if not rid:
        return fail("Invalid recipient id")
    res = await database.notifications().insert_one(
        {"userId": rid, "message": message, "type": type or "info", "isRead": False})
    ndoc = database.serialize(await database.notifications().find_one({"_id": res.inserted_id}))
    await realtime.emit("new_notification", ndoc, room=f"user:{recipient}")
    target = await find_user(recipient, {"name": 1})
    name = (target or {}).get("name") or "user"
    return ok(f"Notification sent to {name}", {"id": str(res.inserted_id)})


# ── events ───────────────────────────────────────────────────────────────────

@agent_tool(name="create_event", label="Create event", severity="write", roles=["admin", "teacher"],
            domain="communication",
            description="Admin/teacher: create a school event (academic, cultural, sports, holiday, meeting, exam, other). "
                        "Args: title, eventType, startDate (ISO), endDate (ISO), description?, startTime?, endTime?, "
                        "location?, targetAudience?(all|students|teachers|parents).")
async def create_event(title: str, event_type: str, start_date: str, end_date: str,
                       description: str = "", start_time: str = "", end_time: str = "",
                       location: str = "", target_audience: str = "all") -> dict:
    if not all([title, event_type, start_date, end_date]):
        return fail("title, eventType, startDate and endDate are required")
    try:
        sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        return fail("startDate/endDate must be ISO dates")
    doc = {
        "title": title, "description": description, "eventType": event_type,
        "startDate": sd, "endDate": ed, "startTime": start_time, "endTime": end_time,
        "location": location, "targetAudience": target_audience or "all",
        "createdBy": database.oid(me()),
    }
    res = await database.events().insert_one(doc)
    event = database.serialize(await database.events().find_one({"_id": res.inserted_id}))

    role_map = {"students": "student", "student": "student", "teachers": "teacher",
                "teacher": "teacher", "parents": "teacher"}
    audience_q = {} if (target_audience or "all") == "all" else {"role": role_map.get((target_audience or "all").lower(), "student")}
    recipients = [u["_id"] async for u in database.users().find(audience_q, {"_id": 1})]
    msg = f"New event: {title} on {sd.strftime('%d %b %Y')}"
    for uid in recipients[:50]:  # bulk cap, same as Node
        await database.notifications().insert_one({"userId": uid, "message": msg, "type": "info"})
    await realtime.emit("event_created", event, broadcast=True)
    return ok(f"Event '{title}' created ({min(len(recipients), 50)} notified)", {"id": str(res.inserted_id)})


@agent_tool(name="list_events", label="Events", domain="communication",
            description="List events. Filter by eventType, startDate, endDate (ISO).")
async def list_events(event_type: str = "", start_date: str = "", end_date: str = "") -> dict:
    q: dict[str, Any] = {}
    if event_type:
        q["eventType"] = event_type
    if start_date:
        try:
            q["startDate"] = {"$gte": datetime.fromisoformat(start_date.replace("Z", "+00:00"))}
        except ValueError:
            return fail("startDate must be an ISO date")
    if end_date:
        try:
            q["endDate"] = {"$lte": datetime.fromisoformat(end_date.replace("Z", "+00:00"))}
        except ValueError:
            return fail("endDate must be an ISO date")
    docs = []
    async for d in database.events().find(q).sort("startDate", 1):
        d = database.serialize(d)
        d["createdBy_"] = await find_user(d.pop("createdBy", None), {"name": 1})
        docs.append(d)
    return ok(f"{len(docs)} events", docs)


@agent_tool(name="upcoming_events", label="Upcoming events", domain="communication",
            description="List the next 10 upcoming events.")
async def upcoming_events() -> dict:
    docs = [database.serialize(d) async for d in
            database.events().find({"startDate": {"$gte": now()}}).sort("startDate", 1).limit(10)]
    return ok(f"{len(docs)} upcoming events", docs)
