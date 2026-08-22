"""Finance domain: fees and payments (port of fee.controller.js, atomic guarded updates)."""

from datetime import datetime
from secrets import token_hex
from typing import Any

import db as database
import realtime
from registry import agent_tool
from tools.common import fail, find_user, me, my_role, now, ok

FEE_TYPES = ("tuition", "exam", "library", "transport", "lab", "hostel", "misc")
PAYMENT_METHODS = ("cash", "card", "bank_transfer", "online", "cheque")


@agent_tool(name="create_fee", label="Create fee", severity="write", roles=["admin"], domain="finance",
            description="Admin: create a fee for a student (tuition, exam, transport, etc.). Args: studentId, classId, "
                        "academicYearId, feeType(tuition|exam|library|transport|lab|hostel|misc), amount, dueDate (ISO), description?.")
async def create_fee(student_id: str, class_id: str, academic_year_id: str, fee_type: str,
                     amount: float, due_date: str, description: str = "") -> dict:
    if my_role() != "admin":
        return fail("Only admins can create fees")
    if not all([student_id, class_id, academic_year_id, fee_type, amount, due_date]):
        return fail("All fields are required")
    if fee_type not in FEE_TYPES:
        return fail(f"feeType must be one of {FEE_TYPES}")
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
    except ValueError:
        return fail("dueDate must be an ISO date")
    doc = {
        "studentId": database.oid(student_id), "classId": database.oid(class_id),
        "academicYearId": database.oid(academic_year_id), "feeType": fee_type,
        "amount": float(amount), "paidAmount": 0, "status": "pending", "dueDate": due,
        "description": description, "createdBy": database.oid(me()),
    }
    res = await database.fees().insert_one(doc)
    fee = database.serialize(await database.fees().find_one({"_id": res.inserted_id}))

    msg = f"New {fee_type} fee of ₹{amount} created. Due: {due.strftime('%d %b %Y')}"
    nid = await database.notifications().insert_one({"userId": doc["studentId"], "message": msg, "type": "info"})
    ndoc = database.serialize(await database.notifications().find_one({"_id": nid.inserted_id}))
    await realtime.emit("new_notification", ndoc, room=f"user:{student_id}")
    return ok(f"Created {fee_type} fee of ₹{amount}", {"id": str(res.inserted_id)})


@agent_tool(name="list_fees", label="Fees", domain="finance",
            description="List fees (admin: all; student: own). Filter by studentId (admin), classId (admin), status, academicYearId.")
async def list_fees(student_id: str = "", class_id: str = "", status: str = "",
                    academic_year_id: str = "") -> dict:
    q: dict[str, Any] = {}
    if my_role() == "admin":
        if student_id:
            q["studentId"] = database.oid(student_id)
        if class_id:
            q["classId"] = database.oid(class_id)
    else:
        q["studentId"] = database.oid(me())  # staff roles have no fee visibility either
    if status:
        q["status"] = status
    if academic_year_id:
        q["academicYearId"] = database.oid(academic_year_id)

    docs = []
    async for d in database.fees().find(q).sort("dueDate", 1):
        d = database.serialize(d)
        d["studentId_"] = await find_user(d.pop("studentId", None), {"name": 1, "email": 1})
        cls = await database.classes().find_one({"_id": database.oid(d.pop("classId", None))}, {"name": 1})
        d["classId_"] = database.serialize(cls)
        docs.append(d)
    return ok(f"{len(docs)} fees", docs)


@agent_tool(name="record_payment", label="Record payment", severity="write", roles=["admin"], domain="finance",
            description="Admin: record a payment against a fee (never overpays; marks paid/partial atomically). "
                        "Args: feeId, amount (>0), paymentMethod(cash|card|bank_transfer|online|cheque), notes?.")
async def record_payment(fee_id: str, amount: float, payment_method: str = "cash", notes: str = "") -> dict:
    if my_role() != "admin":
        return fail("Only admins can record payments")
    fid = database.oid(fee_id)
    paid = float(amount) if amount else 0
    if not fid or paid <= 0:
        return fail("feeId and a positive numeric amount are required")

    # Atomic conditional update: only succeeds when the payment fits the balance.
    fee = await database.fees().find_one_and_update(
        {
            "_id": fid,
            "$expr": {"$and": [
                {"$lt": ["$paidAmount", "$amount"]},
                {"$lte": [{"$add": ["$paidAmount", paid]}, "$amount"]},
            ]},
        },
        [
            {"$set": {"paidAmount": {"$add": ["$paidAmount", paid]}}},
            {"$set": {"status": {"$cond": [{"$gte": ["$paidAmount", "$amount"]}, "paid", "partial"]}}},
        ],
        return_document=True,
    )
    if not fee:
        existing = await database.fees().find_one({"_id": fid}, {"status": 1, "amount": 1, "paidAmount": 1})
        if not existing:
            return fail("Fee not found")
        if existing.get("status") == "paid":
            return fail("Fee already fully paid")
        return fail("Amount exceeds outstanding balance")

    receipt = f"RCP-{int(now().timestamp() * 1000)}-{token_hex(2).upper()}"
    try:
        pres = await database.payments().insert_one({
            "feeId": fee["_id"], "studentId": fee["studentId"], "amount": paid,
            "paymentMethod": payment_method or "cash", "receiptNumber": receipt,
            "receivedBy": database.oid(me()), "notes": notes,
        })
    except Exception as e:
        # Compensate the increment so the ledger stays consistent.
        await database.fees().update_one(
            {"_id": fee["_id"]},
            [
                {"$set": {"paidAmount": {"$max": [0, {"$subtract": ["$paidAmount", paid]}]}}},
                {"$set": {"status": {"$cond": [
                    {"$lte": ["$paidAmount", 0]}, "pending",
                    {"$cond": [{"$gte": ["$paidAmount", "$amount"]}, "paid", "partial"]}]}}},
            ],
        )
        return fail(f"Payment recording failed: {e}")

    payment = database.serialize(await database.payments().find_one({"_id": pres.inserted_id}))
    msg = f"Payment of ₹{paid:g} received for {fee['feeType']}. Receipt: {receipt}"
    sid = str(fee["studentId"])
    nid = await database.notifications().insert_one(
        {"userId": fee["studentId"], "message": msg, "type": "success"})
    ndoc = database.serialize(await database.notifications().find_one({"_id": nid.inserted_id}))
    await realtime.emit("new_notification", ndoc, room=f"user:{sid}")
    updated_fee = database.serialize(await database.fees().find_one({"_id": fee["_id"]}))
    return ok(f"Recorded ₹{paid:g} — receipt {receipt}", {"payment": payment, "fee": updated_fee})


@agent_tool(name="fee_stats", label="Fee statistics", domain="finance",
            description="Get fee collection statistics (by status, overdue count, pending amount). Admin: all; others: own.")
async def fee_stats() -> dict:
    match = {} if my_role() == "admin" else {"studentId": database.oid(me())}
    by_status: list[dict] = []
    async for row in database.fees().aggregate([
        {"$match": match},
        {"$group": {"_id": "$status", "count": {"$sum": 1},
                    "totalAmount": {"$sum": "$amount"}, "totalPaid": {"$sum": "$paidAmount"}}},
    ]):
        by_status.append(database.serialize(row))
    overdue = await database.fees().count_documents({**match, "status": "overdue"})
    pending_amount = 0
    async for row in database.fees().aggregate([
        {"$match": {**match, "status": {"$in": ["pending", "partial", "overdue"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount", "$paidAmount"]}}}},
    ]):
        pending_amount = row.get("total") or 0
    return ok("Fee statistics", {"byStatus": by_status, "overdue": overdue, "pendingAmount": pending_amount})
