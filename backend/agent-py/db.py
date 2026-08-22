"""
Motor (async MongoDB) client shared by every repo/tool module.
Collection names mirror the Mongoose defaults exactly.
"""

import motor.motor_asyncio
from bson import ObjectId

import config

_client = None


def client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(config.MONGODB_URI, serverSelectionTimeoutMS=5000)
    return _client


def db():
    return client().get_default_database()


# Collections (Mongoose default pluralization — verbatim)
users = lambda: db()["users"]  # noqa: E731
classes = lambda: db()["classes"]  # noqa: E731
subjects = lambda: db()["subjects"]  # noqa: E731
academicyears = lambda: db()["academicyears"]  # noqa: E731
attendancesessions = lambda: db()["attendancesessions"]  # noqa: E731
attendancerecords = lambda: db()["attendancerecords"]  # noqa: E731
marks = lambda: db()["marks"]  # noqa: E731
exams = lambda: db()["exams"]  # noqa: E731
notes = lambda: db()["notes"]  # noqa: E731
notices = lambda: db()["notices"]  # noqa: E731
notifications = lambda: db()["notifications"]  # noqa: E731
chatsessions = lambda: db()["chatsessions"]  # noqa: E731
events = lambda: db()["events"]  # noqa: E731
fees = lambda: db()["fees"]  # noqa: E731
payments = lambda: db()["payments"]  # noqa: E731
librarybooks = lambda: db()["librarybooks"]  # noqa: E731
libraryissues = lambda: db()["libraryissues"]  # noqa: E731
inventories = lambda: db()["inventories"]  # noqa: E731
transports = lambda: db()["transports"]  # noqa: E731
transportassignments = lambda: db()["transportassignments"]  # noqa: E731
timetables = lambda: db()["timetables"]  # noqa: E731
parents = lambda: db()["parents"]  # noqa: E731
leaves = lambda: db()["leaves"]  # noqa: E731
facedatas = lambda: db()["facedatas"]  # noqa: E731
agentactionlogs = lambda: db()["agentactionlogs"]  # noqa: E731


def oid(value) -> ObjectId | None:
    """Parse a hex string into ObjectId; None if invalid."""
    if value is None:
        return None
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def serialize(doc) -> dict | None:
    """Mongo doc → JSON-safe dict (ObjectIds → strings)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = serialize(v)
        elif isinstance(v, list):
            out[k] = [serialize(x) if isinstance(x, dict) else (str(x) if isinstance(x, ObjectId) else x) for x in v]
        else:
            out[k] = v
    return out
