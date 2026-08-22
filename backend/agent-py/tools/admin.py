"""Admin domain tools: users, classes, subjects, academic years, stats, parents, leave review."""

from typing import Any

import db as database
import realtime
from registry import agent_tool
from tools.common import fail, find_user, me, now, ok, s


# ── users ────────────────────────────────────────────────────────────────────

@agent_tool(name="list_users", label="Users", severity="read", roles=["admin"], domain="admin",
            description="List all platform users with role, email and class assignments.")
async def list_users() -> dict:
    docs = [database.serialize(d) async for d in database.users().find({}, {"password": 0}).sort("createdAt", -1)]
    return ok(f"{len(docs)} users found", docs)


@agent_tool(name="list_students", label="Students", severity="read", roles=["admin", "teacher"], domain="admin",
            description="List students. WITHOUT classId: ALL students on the entire platform. "
                        "WITH classId: only that class's roster (may be empty even when students exist elsewhere). "
                        "To count students system-wide, omit classId.")
async def list_students(class_id: str = "") -> dict:
    q: dict[str, Any] = {"role": "student"}
    if class_id:
        q["classId"] = database.oid(class_id)
    docs = [database.serialize(d) async for d in database.users().find(q, {"password": 0})]
    return ok(f"{len(docs)} students", docs)


@agent_tool(name="create_user", label="Create user", severity="write", roles=["admin"], domain="admin",
            description="Create ONE user (student/teacher/admin). Args: name, email, password, role, classId?, subjectIds? (array). "
                        "For multiple users use bulk_create_users instead.")
async def create_user(name: str, email: str, password: str, role: str,
                      class_id: str = "", subject_ids: list[str] | None = None) -> dict:
    if not all([name, email, password, role]):
        return fail("name, email, password and role are required")
    if await database.users().find_one({"email": email.lower()}):
        return fail("User already exists with this email")
    res = await database.users().insert_one(_user_doc(name, email, password, role, class_id, subject_ids))
    return ok(f"Created {role} '{name}' ({email})", {"id": str(res.inserted_id)})


def _user_doc(name: str, email: str, password: str, role: str,
              class_id: str = "", subject_ids: list[str] | None = None) -> dict:
    import bcrypt
    return {
        "name": name, "email": email.lower(), "role": role.lower(),
        "password": bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode(),
        "classId": database.oid(class_id) if class_id else None,
        "assignedSubjectIds": [database.oid(x) for x in (subject_ids or [])],
        "managedClassIds": [],
    }


@agent_tool(name="bulk_create_users", label="Bulk create users", severity="write", roles=["admin"], domain="admin",
            description="Create MANY users in one operation (single insert). Args: users = array of "
                        "{name, email, password, role, classId?, subjectIds?}. Existing emails are skipped and reported.")
async def bulk_create_users(users: list[dict]) -> dict:
    if not users or not isinstance(users, list):
        return fail("users must be a non-empty array of {name, email, password, role}")
    docs, skipped = [], []
    seen: set[str] = set()
    for u in users:
        if not all(isinstance(u, dict) and u.get(k) for k in ("name", "email", "password", "role")):
            skipped.append({"email": u.get("email") if isinstance(u, dict) else str(u), "reason": "missing required fields"})
            continue
        email = str(u["email"]).lower()
        if email in seen:
            skipped.append({"email": email, "reason": "duplicate in request"})
            continue
        seen.add(email)
        docs.append((email, _user_doc(u["name"], u["email"], u["password"], u["role"],
                                      str(u.get("classId") or ""), u.get("subjectIds"))))
    existing = {d["email"] async for d in
                database.users().find({"email": {"$in": list(seen)}}, {"email": 1})}
    fresh = [(e, d) for e, d in docs if e not in existing]
    for e in existing:
        skipped.append({"email": e, "reason": "already exists"})
    if fresh:
        await database.users().insert_many([d for _, d in fresh])
    parts = [f"{len(fresh)} created"]
    if skipped:
        parts.append(f"{len(skipped)} skipped")
    return ok(f"Bulk create done: {', '.join(parts)}",
              {"created": [{"email": e} for e, _ in fresh], "skipped": skipped})


async def _cascade_delete(uids: list) -> None:
    """One $in-based delete per collection — N users removed in O(collections), not O(N)."""
    await database.marks().delete_many({"studentId": {"$in": uids}})
    await database.attendancerecords().delete_many({"studentId": {"$in": uids}})
    await database.notifications().delete_many({"userId": {"$in": uids}})
    await database.chatsessions().delete_many({"user": {"$in": uids}})
    await database.facedatas().delete_many({"userId": {"$in": uids}})
    await database.leaves().delete_many({"userId": {"$in": uids}})
    await database.parents().delete_many({"$or": [{"parentId": {"$in": uids}}, {"studentId": {"$in": uids}}]})
    await database.subjects().update_many({}, {"$pull": {"teachers": {"$in": uids}}})
    await database.classes().update_many({"classTeacher": {"$in": uids}}, {"$set": {"classTeacher": None}})
    await database.users().delete_many({"_id": {"$in": uids}})


@agent_tool(name="delete_user", label="Delete user", severity="destructive", roles=["admin"], domain="admin",
            description="Delete exactly ONE user (userId or email) with related records. "
                        "For several users call bulk_delete_users instead.")
async def delete_user(user_id: str = "", email: str = "") -> dict:
    q: dict[str, Any] = {}
    if user_id:
        q["_id"] = database.oid(user_id)
        if q["_id"] is None:
            return fail("Invalid userId format")
    elif email:
        q["email"] = email.lower()
    else:
        return fail("Provide userId or email")
    u = await database.users().find_one(q)
    if not u:
        return fail("User not found")
    if s(u["_id"]) == me():
        return fail("You cannot delete your own account")
    await _cascade_delete([u["_id"]])
    await realtime.emit("USER_DELETED", {"userId": s(u["_id"]), "email": u.get("email"), "role": u.get("role")}, broadcast=True)
    return ok(f"Deleted {u.get('role')} '{u.get('name')}' ({u.get('email')}) with all related records",
              {"id": s(u["_id"])})


@agent_tool(name="bulk_delete_users", label="Bulk delete users", severity="destructive", roles=["admin"], domain="admin",
            description="Delete MANY users in ONE operation (single DB pass with full cascade). Args: "
                        "userIds?[] , emails?[] , role? ('student'|'teacher'|'admin'). "
                        "Provide at least one criterion; the requesting admin is never deleted.")
async def bulk_delete_users(user_ids: list[str] | None = None,
                            emails: list[str] | None = None,
                            role: str = "") -> dict:
    clauses: list[dict] = []
    ids = [database.oid(x) for x in (user_ids or []) if database.oid(x)]
    if ids:
        clauses.append({"_id": {"$in": ids}})
    mails = [str(e).lower() for e in (emails or []) if e]
    if mails:
        clauses.append({"email": {"$in": mails}})
    if role:
        clauses.append({"role": role.lower()})
    if not clauses:
        return fail("Provide userIds, emails or role — refusing to match everyone")
    me_id = me()
    q = {"$and": clauses, "_id": {"$ne": database.oid(me_id)}}
    targets = [database.serialize(d) async for d in
               database.users().find(q, {"_id": 1, "name": 1, "email": 1, "role": 1})]
    if not targets:
        return fail("No matching users to delete")
    await _cascade_delete([database.oid(t["_id"]) for t in targets])
    await realtime.emit("USER_DELETED", {
        "bulk": True, "count": len(targets),
        "users": [{"id": t["_id"], "email": t.get("email")} for t in targets],
    }, broadcast=True)
    preview_list = ", ".join(t.get("email") or t.get("name") or t["_id"] for t in targets[:8])
    more = f" (+{len(targets) - 8} more)" if len(targets) > 8 else ""
    return ok(f"Bulk deleted {len(targets)} users: {preview_list}{more}",
              {"count": len(targets),
               "deleted": [{"id": t["_id"], "name": t.get("name"), "email": t.get("email"), "role": t.get("role")} for t in targets]})


@agent_tool(name="update_user_academic", label="Update user academics", severity="write", roles=["admin"], domain="admin",
            description="Assign ONE user's class/subjects/managed-classes. Args: userId, role, classId?, subjectIds?[], managedClassIds?[]. "
                        "For several users use bulk_update_users instead.")
async def update_user_academic(user_id: str, role: str = "", class_id: str = "",
                               subject_ids: list[str] | None = None,
                               managed_class_ids: list[str] | None = None) -> dict:
    u = await database.users().find_one({"_id": database.oid(user_id)})
    if not u:
        return fail("User not found")
    setu = _academic_set(role, class_id, subject_ids, managed_class_ids)
    if not setu:
        return fail("Nothing to update")
    await database.users().update_one({"_id": u["_id"]}, {"$set": setu})
    await realtime.emit("PROFILE_UPDATED", {"userId": user_id, "user": {"id": user_id}}, room=f"user:{user_id}")
    return ok(f"Updated academic assignment for {s(u.get('name'))}")


def _academic_set(role: str, class_id: str,
                  subject_ids: list[str] | None, managed_class_ids: list[str] | None) -> dict[str, Any]:
    """Translate optional academic args into a $set doc (empty dict = no change)."""
    setu: dict[str, Any] = {}
    if role:
        setu["role"] = role.lower()
    if class_id:
        setu["classId"] = database.oid(class_id)
    if subject_ids is not None:
        setu["assignedSubjectIds"] = [database.oid(x) for x in subject_ids]
    if managed_class_ids is not None:
        setu["managedClassIds"] = [database.oid(x) for x in managed_class_ids]
    return setu


@agent_tool(name="bulk_update_users", label="Bulk update users", severity="write", roles=["admin"], domain="admin",
            description="Update MANY users' academics in one operation. Args: updates = array of "
                        "{userId, role?, classId?, subjectIds?[], managedClassIds?[]}. "
                        "Same-value group changes (one classId + role for everyone) also accepted via "
                        "userIds[] + role? + classId? top-level args.")
async def bulk_update_users(updates: list[dict] | None = None,
                            user_ids: list[str] | None = None,
                            role: str = "", class_id: str = "",
                            subject_ids: list[str] | None = None,
                            managed_class_ids: list[str] | None = None) -> dict:
    jobs: list[tuple[str, dict[str, Any]]] = []
    if updates:
        for upd in updates:
            if not isinstance(upd, dict) or not upd.get("userId"):
                continue
            setu = _academic_set(str(upd.get("role") or ""), str(upd.get("classId") or ""),
                                 upd.get("subjectIds"), upd.get("managedClassIds"))
            if setu:
                jobs.append((str(upd["userId"]), setu))
    elif user_ids:
        setu = _academic_set(role, class_id, subject_ids, managed_class_ids)
        if not setu:
            return fail("Provide fields to set (role, classId, ...)")
        jobs = [(uid, setu) for uid in user_ids]
    else:
        return fail("Provide updates array or userIds with shared fields")

    updated, missing = 0, []
    for uid_str, setu in jobs:
        uid = database.oid(uid_str)
        res = await database.users().update_one({"_id": uid}, {"$set": setu})
        if res.matched_count:
            updated += 1
            await realtime.emit("PROFILE_UPDATED", {"userId": uid_str, "user": {"id": uid_str}}, room=f"user:{uid_str}")
        else:
            missing.append(uid_str)
    msg = f"Bulk update done: {updated} updated"
    if missing:
        msg += f", {len(missing)} not found"
    return ok(msg, {"updated": updated, "missing": missing})


# ── classes / subjects / years ───────────────────────────────────────────────

@agent_tool(name="list_classes", label="Classes", severity="read", domain="admin",
            description="List all classes with section and class teacher.")
async def list_classes() -> dict:
    docs = []
    async for d in database.classes().find({}):
        d = database.serialize(d)
        teacher = await find_user(d.pop("classTeacher", None), {"name": 1, "email": 1})
        d["classTeacherInfo"] = teacher
        docs.append(d)
    return ok(f"{len(docs)} classes", docs)


@agent_tool(name="create_class", label="Create class", severity="write", roles=["admin"], domain="admin",
            description="Create a class. Args: name, section?, classTeacherId?")
async def create_class(name: str, section: str = "", class_teacher_id: str = "") -> dict:
    if not name:
        return fail("Class name is required")
    doc = {"name": name, "section": section,
           "classTeacher": database.oid(class_teacher_id) if class_teacher_id else None}
    res = await database.classes().insert_one(doc)
    created = database.serialize(await database.classes().find_one({"_id": res.inserted_id}))
    await realtime.emit("CLASS_CREATED", created, broadcast=True)
    return ok(f"Class '{name}' created")


@agent_tool(name="delete_class", label="Delete class", severity="destructive", roles=["admin"], domain="admin",
            description="Delete a class by id. Related data may remain orphaned (same as manual delete).")
async def delete_class(class_id: str) -> dict:
    res = await database.classes().delete_one({"_id": database.oid(class_id)})
    if not res.deleted_count:
        return fail("Class not found")
    await realtime.emit("CLASS_DELETED", {"classId": s(class_id)}, broadcast=True)
    return ok("Class deleted")


@agent_tool(name="list_subjects", label="Subjects", severity="read", domain="admin",
            description="List subjects. Optional classId filter; includes assigned teachers.")
async def list_subjects(class_id: str = "") -> dict:
    q = {"classId": database.oid(class_id)} if class_id else {}
    docs = []
    async for d in database.subjects().find(q):
        d = database.serialize(d)
        teachers = []
        for tid in d.pop("teachers", []) or []:
            t = await find_user(tid, {"name": 1, "email": 1})
            if t:
                teachers.append(t)
        d["teachersInfo"] = teachers
        cls = await database.classes().find_one({"_id": database.oid(d.pop("classId", None))}, {"name": 1, "section": 1})
        d["classInfo"] = database.serialize(cls)
        docs.append(d)
    return ok(f"{len(docs)} subjects", docs)


@agent_tool(name="create_subject", label="Create subject", severity="write", roles=["admin"], domain="admin",
            description="Create a subject. Args: name, code, classId, teacherIds?[] .")
async def create_subject(name: str, code: str, class_id: str, teacher_ids: list[str] | None = None) -> dict:
    if not all([name, code, class_id]):
        return fail("name, code and classId are required")
    doc = {"name": name, "code": code.upper(), "classId": database.oid(class_id),
           "teachers": [database.oid(t) for t in (teacher_ids or [])]}
    res = await database.subjects().insert_one(doc)
    created = database.serialize(await database.subjects().find_one({"_id": res.inserted_id}))
    await realtime.emit("SUBJECT_CREATED", created, broadcast=True)
    return ok(f"Subject '{name}' ({code}) created")


@agent_tool(name="update_subject", label="Update subject", severity="write", roles=["admin"], domain="admin",
            description="Admin: update subject name/code or add a teacher. Args: id, name?, code?, teacherId? (teacher to add).")
async def update_subject(id: str, name: str = "", code: str = "", teacher_id: str = "") -> dict:
    sid = database.oid(id)
    sub = await database.subjects().find_one({"_id": sid})
    if not sub:
        return fail("Subject not found")
    setu: dict[str, Any] = {}
    if name:
        setu["name"] = name
    if code:
        setu["code"] = code.upper()
    if teacher_id:
        tid = database.oid(teacher_id)
        if not await database.users().count_documents({"_id": tid, "role": "teacher"}):
            return fail("Teacher not found")
        if tid not in (sub.get("teachers") or []):
            setu["teachers"] = list(sub.get("teachers") or []) + [tid]
            await database.users().update_one({"_id": tid}, {"$addToSet": {"assignedSubjectIds": sid}})
    if not setu:
        return fail("Nothing to update (provide name, code and/or teacherId)")
    await database.subjects().update_one({"_id": sid}, {"$set": setu})
    updated = database.serialize(await database.subjects().find_one({"_id": sid}))
    await realtime.emit("SUBJECT_UPDATED", updated, broadcast=True)
    label = updated.get("name") or id
    extra = " (+1 teacher)" if teacher_id else ""
    return ok(f"Updated subject '{label}'{extra}", {"id": id})


@agent_tool(name="delete_subject", label="Delete subject", severity="destructive", roles=["admin"], domain="admin",
            description="Delete a subject AND its marks/notes/notices/sessions (cascade, same as manual delete).")
async def delete_subject(subject_id: str) -> dict:
    sid = database.oid(subject_id)
    if not await database.subjects().find_one({"_id": sid}):
        return fail("Subject not found")
    await database.users().update_many({"assignedSubjectIds": sid}, {"$pull": {"assignedSubjectIds": sid}})
    await database.attendancesessions().delete_many({"subjectId": sid})
    await database.marks().delete_many({"subjectId": sid})
    await database.notes().delete_many({"subjectId": sid})
    await database.notices().delete_many({"subjectId": sid})
    await database.subjects().delete_one({"_id": sid})
    await realtime.emit("SUBJECT_DELETED", {"subjectId": s(subject_id)}, broadcast=True)
    return ok("Subject deleted with cascaded data")


@agent_tool(name="academic_years", label="Academic years", severity="read", roles=["admin"], domain="admin",
            description="List all academic years.")
async def academic_years() -> dict:
    docs = [database.serialize(d) async for d in database.academicyears().find({}).sort("startDate", -1)]
    return ok(f"{len(docs)} academic years", docs)


@agent_tool(name="create_academic_year", label="Create academic year", severity="write", roles=["admin"], domain="admin",
            description="Create an academic year. Args: name, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), isCurrent?")
async def create_academic_year(name: str, start_date: str, end_date: str, is_current: bool = False) -> dict:
    if not all([name, start_date, end_date]):
        return fail("name, startDate and endDate are required")
    existing = await database.academicyears().find_one({"name": name})
    if existing:
        return ok(f"Academic year already exists: {name}", database.serialize(existing))
    if is_current:
        await database.academicyears().update_many({}, {"$set": {"isCurrent": False}})
    from datetime import datetime as dt
    doc = {"name": name, "isCurrent": bool(is_current)}
    for key, val in (("startDate", start_date), ("endDate", end_date)):
        try:
            doc[key] = dt.fromisoformat(val)
        except Exception:
            return fail(f"Invalid date format for {key}: use YYYY-MM-DD")
    res = await database.academicyears().insert_one(doc)
    return ok(f"Academic year '{name}' created", {"id": str(res.inserted_id)})


@agent_tool(name="system_stats", label="System stats", severity="read", roles=["admin"], domain="admin",
            description="Platform-wide counts: users, students, teachers, classes, subjects.")
async def system_stats() -> dict:
    data = {
        "totalUsers": await database.users().count_documents({}),
        "activeStudents": await database.users().count_documents({"role": "student"}),
        "activeTeachers": await database.users().count_documents({"role": "teacher"}),
        "totalClasses": await database.classes().count_documents({}),
        "totalSubjects": await database.subjects().count_documents({}),
    }
    return ok("System stats done", data)


# ── parents ──────────────────────────────────────────────────────────────────

@agent_tool(name="link_parent", label="Link parent", severity="write", roles=["admin"], domain="admin",
            description="Link a parent account to a student. Args: parentId, studentId, relationship, isPrimary?")
async def link_parent(parent_id: str, student_id: str, relationship: str, is_primary: bool = False) -> dict:
    if not all([parent_id, student_id, relationship]):
        return fail("parentId, studentId and relationship are required")
    if not await database.users().find_one({"_id": database.oid(parent_id)}):
        return fail("Parent user not found")
    student = await database.users().find_one({"_id": database.oid(student_id), "role": "student"})
    if not student:
        return fail("Student not found")
    await database.parents().update_one(
        {"parentId": database.oid(parent_id), "studentId": database.oid(student_id)},
        {"$set": {"relationship": relationship, "isPrimary": bool(is_primary)}},
        upsert=True)
    return ok(f"Parent linked to student {s(student.get('name'))}")


@agent_tool(name="my_children", label="My children", severity="read", domain="helper",
            description="List the current parent's linked children with class info.")
async def my_children(ctx_user_id: str = "") -> dict:
    links = [database.serialize(d) async for d in database.parents().find({"parentId": database.oid(ctx_user_id)})]
    out = []
    for l in links:
        child = await find_user(l.get("studentId"), {"name": 1, "email": 1, "classId": 1, "role": 1})
        out.append({"relationship": l.get("relationship"), "isPrimary": l.get("isPrimary"), "child": child})
    return ok(f"{len(out)} linked children", out)


# ── leaves review (admin side lives here; request/list in helper/comms) ──────

@agent_tool(name="review_leave", label="Review leave", severity="write", roles=["admin"], domain="admin",
            description="Approve or reject a leave request. Args: leaveId, status(approved|rejected), reviewComment?")
async def review_leave(leave_id: str, status: str, review_comment: str = "") -> dict:
    if status not in ("approved", "rejected"):
        return fail("Status must be approved or rejected")
    leave = await database.db()["leaves"].find_one({"_id": database.oid(leave_id)})
    if not leave:
        return fail("Leave not found")
    if leave.get("status") != "pending":
        return fail("Leave already reviewed")
    admin = await find_user(s(leave.get("userId")))
    await database.db()["leaves"].update_one(
        {"_id": leave["_id"]},
        {"$set": {"status": status, "reviewComment": review_comment, "reviewedBy": database.oid(admin["id"]) if admin else None,
                  "reviewedAt": now(), "updatedAt": now()}})
    msg = f"Your {leave.get('leaveType')} leave request has been {status}"
    ntype = "success" if status == "approved" else "warning"
    nid = (await database.notifications().insert_one(
        {"userId": leave["userId"], "message": msg, "type": ntype, "isRead": False, "metadata": {}, "createdAt": now()})).inserted_id
    ndoc = database.serialize(await database.notifications().find_one({"_id": nid}))
    await realtime.emit("new_notification", ndoc, room=f"user:{leave['userId']}")
    return ok(f"Leave {status}", {"leaveId": leave_id, "message": msg})
