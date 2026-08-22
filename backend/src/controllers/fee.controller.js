const Fee = require("../models/fee.model");
const Payment = require("../models/payment.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

// Create fee structure for a student
const createFee = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can create fees" });
        }
        const { studentId, classId, academicYearId, feeType, amount, dueDate, description } = req.body;
        if (!studentId || !classId || !academicYearId || !feeType || !amount || !dueDate) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const fee = await Fee.create({
            studentId, classId, academicYearId, feeType, amount, dueDate, description,
            createdBy: req.user.id
        });

        // Notify student
        await Notification.create({
            userId: studentId,
            message: `New ${feeType} fee of ₹${amount} created. Due: ${new Date(dueDate).toLocaleDateString()}`,
            type: "info"
        });

        const io = req.app.get("io");
        if (io) io.to(`user:${studentId}`).emit("new_notification", { message: `New ${feeType} fee created` });

        res.status(201).json(fee);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get fees (admin: all, others: own only — financial data is admin/student scope)
const getFees = async (req, res) => {
    try {
        const { classId, status, academicYearId } = req.query;
        let query = {};
        if (req.user.role === "admin") {
            const { studentId } = req.query;
            if (studentId) query.studentId = studentId;
        } else {
            // Students see only their own fees; staff roles have no fee visibility
            query.studentId = req.user.id;
        }
        if (classId && req.user.role === "admin") query.classId = classId;
        if (status) query.status = status;
        if (academicYearId) query.academicYearId = academicYearId;

        const fees = await Fee.find(query)
            .populate("studentId", "name email")
            .populate("classId", "name")
            .sort({ dueDate: 1 });
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Record a payment (atomic: balance check + increment in a single guarded update)
const recordPayment = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can record payments" });
        }
        const { feeId, amount, paymentMethod, transactionId, notes } = req.body;
        const paidAmount = Number(amount);
        if (!feeId || !Number.isFinite(paidAmount) || paidAmount <= 0) {
            return res.status(400).json({ message: "feeId and a positive numeric amount are required" });
        }

        // Atomic conditional update: only succeeds when the payment fits within
        // the outstanding balance — no read-modify-write race window.
        const fee = await Fee.findOneAndUpdate(
            {
                _id: feeId,
                $expr: {
                    $and: [
                        { $lt: ["$paidAmount", "$amount"] },                              // not already fully paid
                        { $lte: [{ $add: ["$paidAmount", paidAmount] }, "$amount"] }      // would not overpay
                    ]
                }
            },
            [
                { $set: { paidAmount: { $add: ["$paidAmount", paidAmount] } } },
                { $set: { status: { $cond: [{ $gte: ["$paidAmount", "$amount"] }, "paid", "partial"] } } }
            ],
            { new: true, updatePipeline: true }
        );

        if (!fee) {
            // Distinguish the failure reasons for a helpful response
            const existing = await Fee.findById(feeId).select("status amount paidAmount");
            if (!existing) return res.status(404).json({ message: "Fee not found" });
            if (existing.status === "paid") return res.status(400).json({ message: "Fee already fully paid" });
            return res.status(400).json({ message: "Amount exceeds outstanding balance" });
        }

        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        let payment;
        try {
            payment = await Payment.create({
                feeId: fee._id, studentId: fee.studentId, amount: paidAmount, paymentMethod,
                transactionId, receiptNumber, receivedBy: req.user.id, notes
            });
        } catch (err) {
            // Compensate the atomic increment so ledger stays consistent
            await Fee.updateOne(
                { _id: fee._id },
                [
                    { $set: { paidAmount: { $max: [0, { $subtract: ["$paidAmount", paidAmount] }] } } },
                    { $set: { status: { $cond: [{ $lte: ["$paidAmount", 0] }, "pending", { $cond: [{ $gte: ["$paidAmount", "$amount"] }, "paid", "partial"] }] } } }
                ],
                { updatePipeline: true }
            ).catch((e) => console.error("Fee rollback failed:", e.message));
            if (err.code === 11000 && err.keyPattern?.transactionId) {
                return res.status(409).json({ message: "This transaction ID has already been recorded" });
            }
            throw err;
        }

        await Notification.create({
            userId: fee.studentId,
            message: `Payment of ₹${paidAmount} received for ${fee.feeType}. Receipt: ${receiptNumber}`,
            type: "success"
        });

        const io = req.app.get("io");
        if (io) io.to(`user:${fee.studentId}`).emit("new_notification", { message: `Payment recorded: ₹${paidAmount}` });

        res.status(201).json({ payment, fee });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get payment history (admin: all, others: own only)
const getPayments = async (req, res) => {
    try {
        const { feeId } = req.query;
        let query = {};
        if (req.user.role === "admin") {
            const { studentId } = req.query;
            if (studentId) query.studentId = studentId;
        } else {
            query.studentId = req.user.id;
        }
        if (feeId) query.feeId = feeId;

        const payments = await Payment.find(query)
            .populate("feeId", "feeType amount")
            .populate("studentId", "name email")
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Fee summary/dashboard stats (admin: all, others: own only)
const getFeeStats = async (req, res) => {
    try {
        const match = {};
        if (req.user.role !== "admin") match.studentId = req.user.id;

        const stats = await Fee.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    totalPaid: { $sum: "$paidAmount" }
                }
            }
        ]);

        const overdue = await Fee.countDocuments({ ...match, status: "overdue" });
        const pendingAmount = await Fee.aggregate([
            { $match: { ...match, status: { $in: ["pending", "partial", "overdue"] } } },
            { $group: { _id: null, total: { $sum: { $subtract: ["$amount", "$paidAmount"] } } } }
        ]);

        res.json({
            byStatus: stats,
            overdue,
            pendingAmount: pendingAmount[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update overdue fees (cron-like)
const updateOverdueFees = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can run this" });
        }
        const result = await Fee.updateMany(
            { dueDate: { $lt: new Date() }, status: { $in: ["pending", "partial"] } },
            { $set: { status: "overdue" } }
        );
        res.json({ message: `${result.modifiedCount} fees marked as overdue` });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createFee, getFees, recordPayment, getPayments, getFeeStats, updateOverdueFees };
