const Leave = require("../models/leave.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

// Request leave (student/teacher)
const requestLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date must be after start date" });
        }

        const leave = await Leave.create({
            userId: req.user.id, leaveType, startDate, endDate, reason
        });

        // Notify admin
        const admins = await User.find({ role: "admin" }).select("_id");
        for (const admin of admins) {
            await Notification.create({
                userId: admin._id,
                message: `New ${leaveType} leave request from ${req.user.name || "user"}`,
                type: "info"
            });
        }

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get leave requests
const getLeaves = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === "student" || req.user.role === "teacher") {
            query.userId = req.user.id;
        }
        const { status, userId } = req.query;
        if (status) query.status = status;
        if (userId && req.user.role === "admin") query.userId = userId;

        const leaves = await Leave.find(query)
            .populate("userId", "name email role classId")
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Approve/reject leave (admin only)
const reviewLeave = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can review leaves" });
        }
        const { status, reviewComment } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Status must be approved or rejected" });
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave not found" });
        if (leave.status !== "pending") {
            return res.status(400).json({ message: "Leave already reviewed" });
        }

        leave.status = status;
        leave.reviewedBy = req.user.id;
        leave.reviewComment = reviewComment;
        leave.reviewedAt = new Date();
        await leave.save();

        await Notification.create({
            userId: leave.userId,
            message: `Your ${leave.leaveType} leave request has been ${status}`,
            type: status === "approved" ? "success" : "warning"
        });

        const io = req.app.get("io");
        if (io) io.to(`user:${leave.userId}`).emit("new_notification", { message: `Leave ${status}` });

        res.json(leave);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Cancel leave
const cancelLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave not found" });
        if (leave.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        if (leave.status !== "pending") {
            return res.status(400).json({ message: "Can only cancel pending leaves" });
        }
        leave.status = "cancelled";
        await leave.save();
        res.json(leave);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { requestLeave, getLeaves, reviewLeave, cancelLeave };
