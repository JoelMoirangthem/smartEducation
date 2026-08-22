"""School Operations domain: library, transport, inventory and leave management."""

import re
from datetime import datetime
from secrets import token_hex
from typing import Any

import db as database
import realtime
from registry import agent_tool
from tools.common import fail, find_user, get_ctx, me, my_role, now, ok, s

LEAVE_TYPES = ("sick", "personal", "family", "medical", "academic", "other")
INVENTORY_CATEGORIES = ("furniture", "electronics", "lab_equipment", "sports", "stationery", "other")


# ── library ──────────────────────────────────────────────────────────────────

@agent_tool(name="add_library_book", label="Add library book", severity="write", roles=["admin"],
            domain="operations",
            description="Admin: add a book to the library catalog. Args: title, author, category, isbn?, totalCopies?, location?.")
async def add_library_book(title: str, author: str, category: str, isbn: str = "",
                           total_copies: int = 1, location: str = "") -> dict:
    if my_role() != "admin":
        return fail("Only admins can add books")
    if not all([title, author, category]):
        return fail("title, author and category are required")
    copies = max(1, int(total_copies or 1))
    res = await database.librarybooks().insert_one({
        "title": title, "author": author, "category": category, "isbn": isbn,
        "totalCopies": copies, "availableCopies": copies,
        "status": "available", "location": location,
    })
    return ok(f"Added '{title}' ({copies} copies)", {"id": str(res.inserted_id)})


@agent_tool(name="search_books", label="Search library", domain="operations",
            description="Search library books by title, author, or category. Args: q?, category?.")
async def search_books(q: str = "", category: str = "") -> dict:
    query: dict[str, Any] = {}
    if q:
        # $text needs a text index; fall back to a regex scan when absent.
        try:
            query["$text"] = {"$search": q}
            docs = [database.serialize(d) async for d in database.librarybooks().find(query).sort("title", 1)]
        except Exception:
            rx = {"$options": "i", "$regex": re.escape(q)}
            query = {"$or": [{"title": rx}, {"author": rx}, {"category": rx}]}
            docs = [database.serialize(d) async for d in database.librarybooks().find(query).sort("title", 1)]
    else:
        docs = [database.serialize(d) async for d in database.librarybooks().find(query).sort("title", 1)]
    if category:
        docs = [d for d in docs if (d.get("category") or "").lower() == category.lower()]
    return ok(f"{len(docs)} books found", docs)


@agent_tool(name="issue_book", label="Issue library book", severity="write", roles=["admin", "teacher"],
            domain="operations",
            description="Staff: issue a library book to a user. Args: bookId, userId, dueDate (ISO).")
async def issue_book(book_id: str, user_id: str, due_date: str) -> dict:
    if not all([book_id, user_id, due_date]):
        return fail("bookId, userId, and dueDate are required")
    bid, uid = database.oid(book_id), database.oid(user_id)
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
    except ValueError:
        return fail("dueDate must be an ISO date")
    book = await database.librarybooks().find_one({"_id": bid})
    if not book:
        return fail("Book not found")
    if (book.get("availableCopies") or 0) <= 0:
        return fail("No copies available")
    if await database.libraryissues().count_documents(
            {"bookId": bid, "userId": uid, "status": {"$in": ["issued", "overdue"]}}):
        return fail("User already has this book issued")

    res = await database.libraryissues().insert_one(
        {"bookId": bid, "userId": uid, "dueDate": due, "issueDate": now(),
         "issuedBy": database.oid(me()), "status": "issued", "fine": 0})
    updated = await database.librarybooks().find_one_and_update(
        {"_id": bid, "availableCopies": {"$gt": 0}},
        {"$inc": {"availableCopies": -1}}, return_document=True)
    if updated:
        await database.librarybooks().update_one(
            {"_id": bid},
            {"$set": {"status": "out_of_stock" if (updated.get("availableCopies") or 0) == 0 else "available"}})

    msg = f"Book \"{book['title']}\" issued. Due: {due.strftime('%d %b %Y')}"
    nid = await database.notifications().insert_one({"userId": uid, "message": msg, "type": "info"})
    ndoc = database.serialize(await database.notifications().find_one({"_id": nid.inserted_id}))
    await realtime.emit("new_notification", ndoc, room=f"user:{user_id}")
    issue = database.serialize(await database.libraryissues().find_one({"_id": res.inserted_id}))
    return ok(f"Issued '{book['title']}' (due {due.strftime('%d %b %Y')})", issue)


@agent_tool(name="return_book", label="Return library book", severity="write", roles=["admin", "teacher"],
            domain="operations",
            description="Return an issued book (auto-calculates overdue fine at ₹5/day). Args: issueId.")
async def return_book(issue_id: str) -> dict:
    issue = await database.libraryissues().find_one({"_id": database.oid(issue_id)})
    if not issue:
        return fail("Issue record not found")
    if my_role() not in ("admin", "teacher") and str(issue.get("userId")) != me():
        return fail("You can only return your own books")
    if issue.get("status") == "returned":
        return fail("Already returned")

    returned_at = now()
    fine = 0
    if returned_at > issue["dueDate"]:
        days_overdue = (returned_at - issue["dueDate"]).days
        fine = max(days_overdue, 0) * 5
    await database.libraryissues().update_one(
        {"_id": issue["_id"]},
        {"$set": {"returnDate": returned_at, "status": "returned", "fine": fine}})

    book = await database.librarybooks().find_one({"_id": issue["bookId"]})
    if book and (book.get("totalCopies") or 0) > 0:
        updated = await database.librarybooks().find_one_and_update(
            {"_id": book["_id"], "$expr": {"$lt": ["$availableCopies", "$totalCopies"]}},
            {"$inc": {"availableCopies": 1}}, return_document=True)
        if updated:
            await database.librarybooks().update_one(
                {"_id": book["_id"]},
                {"$set": {"status": "out_of_stock" if (updated.get("availableCopies") or 0) == 0 else "available"}})

    doc = database.serialize(await database.libraryissues().find_one({"_id": issue["_id"]}))
    extra = f" — fine ₹{fine}" if fine else ""
    return ok(f"Book returned{extra}", doc)


@agent_tool(name="overdue_books", label="Overdue books", roles=["admin", "teacher"], domain="operations",
            description="Staff: list all overdue library books with borrower details.")
async def overdue_books() -> dict:
    docs = []
    async for d in database.libraryissues().find(
            {"status": "issued", "dueDate": {"$lt": now()}}).sort("dueDate", 1):
        d = database.serialize(d)
        d["bookId_"] = database.serialize(await database.librarybooks().find_one(
            {"_id": database.oid(d.pop("bookId", None))}, {"title": 1, "author": 1}))
        u = await find_user(d.pop("userId", None), {"name": 1, "email": 1, "classId": 1})
        d["userId_"] = u
        days = (now() - d["dueDate"].replace(tzinfo=None)).days if d.get("dueDate") else 0
        d["daysOverdue"] = max(days, 0)
        docs.append(d)
    return ok(f"{len(docs)} overdue books", docs)


# ── transport ────────────────────────────────────────────────────────────────

@agent_tool(name="create_transport_route", label="Create transport route", severity="write", roles=["admin"],
            domain="operations",
            description="Admin: create a bus route with stops. Args: routeName, busNumber, capacity, academicYearId, "
                        "driverName?, monthlyFee?, stops? (list of {name, time, order}).")
async def create_transport_route(route_name: str, bus_number: str, capacity: int,
                                 academic_year_id: str, driver_name: str = "",
                                 monthly_fee: float = 0, stops: list[dict] | None = None) -> dict:
    if my_role() != "admin":
        return fail("Only admins can manage transport")
    if not all([route_name, bus_number, capacity, academic_year_id]):
        return fail("routeName, busNumber, capacity and academicYearId are required")
    res = await database.transports().insert_one({
        "routeName": route_name, "busNumber": bus_number, "driverName": driver_name,
        "capacity": int(capacity), "monthlyFee": float(monthly_fee or 0),
        "academicYearId": database.oid(academic_year_id),
        "stops": stops or [], "isActive": True, "assignedStudents": [],
    })
    route = database.serialize(await database.transports().find_one({"_id": res.inserted_id}))
    return ok(f"Created route '{route_name}'", route)


@agent_tool(name="list_transport_routes", label="Transport routes", domain="operations",
            description="List all active transport routes.")
async def list_transport_routes() -> dict:
    docs = [database.serialize(d) async for d in
            database.transports().find({"isActive": True}).sort("routeName", 1)]
    return ok(f"{len(docs)} routes", docs)


@agent_tool(name="assign_transport", label="Assign student to transport", severity="write", roles=["admin"],
            domain="operations",
            description="Admin: assign a student to a bus route. Args: transportId, studentId, pickupStop?, dropStop?.")
async def assign_transport(transport_id: str, student_id: str, pickup_stop: str = "", drop_stop: str = "") -> dict:
    if my_role() != "admin":
        return fail("Only admins can assign transport")
    tid, sid = database.oid(transport_id), database.oid(student_id)
    if not tid or not sid:
        return fail("transportId and studentId required")
    route = await database.transports().find_one({"_id": tid})
    if not route:
        return fail("Route not found")
    current = await database.transportassignments().count_documents({"transportId": tid, "isActive": True})
    if current >= (route.get("capacity") or 0):
        return fail("Route is at full capacity")
    res = await database.transportassignments().insert_one({
        "transportId": tid, "studentId": sid, "pickupStop": pickup_stop, "dropStop": drop_stop,
        "isActive": True, "assignedAt": now(),
    })
    student = await find_user(student_id, {"name": 1})
    return ok(f"Assigned {(student or {}).get('name', 'student')} to route '{route['routeName']}' "
              f"({current + 1}/{route.get('capacity')})", {"id": str(res.inserted_id)})


# ── leave ────────────────────────────────────────────────────────────────────

@agent_tool(name="request_leave", label="Request leave", severity="write",
            roles=["student", "teacher"], domain="operations",
            description="Student/teacher: request leave. Args: leaveType(sick|personal|family|medical|academic|other), "
                        "startDate (ISO), endDate (ISO), reason.")
async def request_leave(leave_type: str, start_date: str, end_date: str, reason: str) -> dict:
    if not all([leave_type, start_date, end_date, reason]):
        return fail("All fields are required")
    if leave_type not in LEAVE_TYPES:
        return fail(f"leaveType must be one of {LEAVE_TYPES}")
    try:
        sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        return fail("startDate/endDate must be ISO dates")
    if ed < sd:
        return fail("End date must be after start date")

    ctx = get_ctx()
    res = await database.leaves().insert_one({
        "userId": database.oid(me()), "leaveType": leave_type, "startDate": sd, "endDate": ed,
        "reason": reason, "status": "pending",
    })
    admins = [u["_id"] async for u in database.users().find({"role": "admin"}, {"_id": 1})]
    msg = f"New {leave_type} leave request from {(getattr(ctx, 'name', '') or 'user')}"
    for aid in admins:
        await database.notifications().insert_one({"userId": aid, "message": msg, "type": "info"})
        await realtime.emit("new_notification", {"message": msg, "type": "info"}, room=f"user:{aid}")
    return ok(f"{leave_type.capitalize()} leave submitted ({sd:%d %b} – {ed:%d %b})",
              {"id": str(res.inserted_id)})


@agent_tool(name="list_leaves", label="Leave requests", domain="operations",
            description="List leave requests (own for students/teachers; all for admins). Filter by status.")
async def list_leaves(status: str = "") -> dict:
    q: dict[str, Any] = {}
    if my_role() in ("student", "teacher"):
        q["userId"] = database.oid(me())
    if status:
        q["status"] = status
    docs = []
    async for d in database.leaves().find(q).sort("createdAt", -1):
        d = database.serialize(d)
        d["userId_"] = await find_user(d.pop("userId", None), {"name": 1, "email": 1, "role": 1})
        reviewer = d.pop("reviewedBy", None)
        d["reviewedBy_"] = await find_user(reviewer, {"name": 1}) if reviewer else None
        docs.append(d)
    return ok(f"{len(docs)} leave requests", docs)


# ── inventory ────────────────────────────────────────────────────────────────

@agent_tool(name="add_inventory", label="Add inventory item", severity="write", roles=["admin"],
            domain="operations",
            description="Admin: add an item to school inventory. Args: name, category"
                        "(furniture|electronics|lab_equipment|sports|stationery|other), quantity?, location?, "
                        "purchasePrice?, purchaseDate? (ISO).")
async def add_inventory(name: str, category: str, quantity: int = 1, location: str = "",
                        purchase_price: float = 0, purchase_date: str = "") -> dict:
    if my_role() != "admin":
        return fail("Only admins can manage inventory")
    if not name or category not in INVENTORY_CATEGORIES:
        return fail(f"name is required; category must be one of {INVENTORY_CATEGORIES}")
    pd_ = None
    if purchase_date:
        try:
            pd_ = datetime.fromisoformat(purchase_date.replace("Z", "+00:00"))
        except ValueError:
            return fail("purchaseDate must be an ISO date")
    asset_code = f"INV-{int(now().timestamp()):X}-{token_hex(2).upper()}"
    res = await database.inventories().insert_one({
        "name": name, "category": category, "quantity": max(1, int(quantity or 1)),
        "status": "available", "location": location, "assetCode": asset_code,
        "purchasePrice": float(purchase_price or 0),
        **({"purchaseDate": pd_} if pd_ else {}),
    })
    return ok(f"Added '{name}' ({quantity} pcs)", {"id": str(res.inserted_id), "assetCode": asset_code})


@agent_tool(name="list_inventory", label="Inventory", domain="operations",
            description="List inventory items. Filter by category, status.")
async def list_inventory(category: str = "", status: str = "") -> dict:
    q: dict[str, Any] = {}
    if category:
        q["category"] = category
    if status:
        q["status"] = status
    docs = []
    async for d in database.inventories().find(q).sort("name", 1):
        d = database.serialize(d)
        assigned_to = d.pop("assignedTo", None)
        d["assignedTo_"] = await find_user(assigned_to, {"name": 1}) if assigned_to else None
        cls = d.pop("classId", None)
        cdoc = await database.classes().find_one({"_id": database.oid(cls)}, {"name": 1}) if cls else None
        d["classId_"] = database.serialize(cdoc)
        docs.append(d)
    return ok(f"{len(docs)} items", docs)


@agent_tool(name="inventory_stats", label="Inventory statistics", roles=["admin"], domain="operations",
            description="Admin: get inventory counts and value by category.")
async def inventory_stats() -> dict:
    by_cat: list[dict] = []
    async for row in database.inventories().aggregate([
        {"$group": {
            "_id": {"category": "$category", "status": "$status"},
            "count": {"$sum": "$quantity"},
            "totalValue": {"$sum": {"$multiply": [{"$ifNull": ["$quantity", 0]},
                                                  {"$ifNull": ["$purchasePrice", 0]}]}},
        }},
        {"$sort": {"_id.category": 1}},
    ]):
        by_cat.append(database.serialize(row))
    total_items = 0
    async for row in database.inventories().aggregate(
            [{"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$quantity", 0]}}}}]):
        total_items = row.get("total") or 0
    return ok("Inventory statistics", {"byCategoryAndStatus": by_cat, "totalItems": total_items})
