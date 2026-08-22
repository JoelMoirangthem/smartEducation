"""Helper domain: profile, teacher classes, student exams and face-registration tools."""

from datetime import datetime

import db as database
import httpx
import realtime
import config
from registry import agent_tool
from tools.common import fail, me, my_role, ok


# ── profile ──────────────────────────────────────────────────────────────────

@agent_tool(name="get_profile", label="My profile", domain="helper",
            description="Get the current user's profile (name, email, role, class, subjects).")
async def get_profile() -> dict:
    u = await database.users().find_one({"_id": database.oid(me())}, {"password": 0})
    if not u:
        return fail("User not found")
    doc = database.serialize(u)
    if doc.get("classId"):
        cls = await database.classes().find_one({"_id": doc["classId"]}, {"name": 1, "section": 1})
        doc["classId_"] = database.serialize(cls)
    if doc.get("assignedSubjectIds"):
        subs = [database.serialize(s) async for s in
                database.subjects().find({"_id": {"$in": doc["assignedSubjectIds"]}}, {"name": 1, "code": 1})]
        doc["assignedSubjects_"] = subs
    return ok(f"Profile of {doc.get('name', 'user')}", doc)


@agent_tool(name="update_profile", label="Update profile", severity="write", domain="helper",
            description="Update own profile name and bio. Args: name?, bio?.")
async def update_profile(name: str = "", bio: str = "") -> dict:
    setu: dict = {}
    if name:
        setu["name"] = name
    if bio:
        setu["bio"] = bio
    if not setu:
        return fail("Nothing to update (provide name and/or bio)")
    updated = await database.users().find_one_and_update(
        {"_id": database.oid(me())}, {"$set": setu}, return_document=True,
        projection={"password": 0})
    if not updated:
        return fail("User not found")
    doc = database.serialize(updated)
    await realtime.emit("PROFILE_UPDATED", {"userId": me(), "user": doc}, broadcast=True)
    return ok("Profile updated successfully", doc)


# ── classes / exams ──────────────────────────────────────────────────────────

@agent_tool(name="get_my_classes", label="My classes", roles=["teacher"], domain="helper",
            description="List classes the teacher manages or teaches a subject in.")
async def get_my_classes() -> dict:
    tid = database.oid(me())
    out: dict[str, dict] = {}
    async for c in database.classes().find({"classTeacher": tid}):
        out[str(c["_id"])] = database.serialize(c)
    async for sub in database.subjects().find({"teachers": tid}):
        if sub.get("classId") and str(sub["classId"]) not in out:
            cls = await database.classes().find_one({"_id": sub["classId"]})
            if cls:
                out[str(cls["_id"])] = database.serialize(cls)
    u = await database.users().find_one({"_id": tid}, {"classId": 1})
    legacy = (u or {}).get("classId")
    if legacy and str(legacy) not in out:
        cls = await database.classes().find_one({"_id": legacy})
        if cls:
            out[str(cls["_id"])] = database.serialize(cls)
    docs = list(out.values())
    return ok(f"{len(docs)} classes", docs)


@agent_tool(name="upcoming_exams", label="Upcoming exams", roles=["student"], domain="helper",
            description="Student: list upcoming exams for your class.")
async def upcoming_exams() -> dict:
    u = await database.users().find_one({"_id": database.oid(me())}, {"classId": 1})
    class_id = (u or {}).get("classId")
    if not class_id:
        return ok("No class assigned — no exams to show", [])
    docs = []
    async for d in database.exams().find(
            {"classId": class_id, "date": {"$gte": datetime.utcnow()}, "isActive": True}
    ).sort("date", 1).limit(10):
        d = database.serialize(d)
        d["subjectId_"] = database.serialize(await database.subjects().find_one(
            {"_id": d.pop("subjectId", None)}, {"name": 1, "code": 1}))
        docs.append(d)
    return ok(f"{len(docs)} upcoming exams", docs)


# ── face registration ────────────────────────────────────────────────────────

@agent_tool(name="face_status", label="Face registration status", domain="helper",
            description="Check whether a user has a registered face (student: own; teacher/admin: any userId). "
                        "Args: userId (defaults to yourself for students).")
async def face_status(user_id: str = "") -> dict:
    target = user_id or me()
    if my_role() == "student" and target != me():
        return fail("Students can only check their own face status")
    fd = await database.facedatas().find_one({"userId": database.oid(target)})
    if fd and fd.get("isRegistered"):
        fd = database.serialize(fd)
        return ok("Face registered", {
            "userId": target, "registered": True, "canUpdate": True,
            "registeredAt": fd.get("registeredAt"), "imagesCount": fd.get("imagesCount"),
            "lastUpdated": fd.get("lastUpdated"),
        })
    return ok("No face registered yet", {"userId": target, "registered": False, "canUpdate": False})


@agent_tool(name="face_service_health", label="Face service health", domain="helper",
            description="Check the Python face service health and registered face count.")
async def face_service_health() -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            resp = await c.get(f"{config.FACE_SERVICE_URL}/health")
        result = resp.json()
    except Exception as e:
        return fail(f"Python face service unavailable: {e}")
    registered = await database.facedatas().count_documents({"isRegistered": True})
    return ok("Face service reachable", {"pythonService": result, "registeredInDB": registered})


@agent_tool(name="delete_face_data", label="Delete face data", severity="destructive",
            roles=["admin"], domain="helper",
            description="Admin: delete a user's registered face embeddings from the face service. Args: studentId.")
async def delete_face_data(student_id: str) -> dict:
    sid = database.oid(student_id)
    if not sid:
        return fail("studentId is required")
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            resp = await c.delete(f"{config.FACE_SERVICE_URL}/delete-face/{student_id}")
        data = resp.json() if resp.content else {}
    except Exception as e:
        return fail(f"Face service delete failed: {e}")
    if resp.status_code >= 400:
        return fail(data.get("error") or f"Face service delete failed (HTTP {resp.status_code})")
    await realtime.emit("FACE_DELETED", {"userId": student_id}, room=f"user:{student_id}")
    return ok("Face data deleted", {"userId": student_id})
