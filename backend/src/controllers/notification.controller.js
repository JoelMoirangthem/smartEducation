const Notification = require("../models/notification.model");

const getUserNotifications = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const notifications = await Notification.find({
            userId: req.user.id,
            createdAt: { $gte: sevenDaysAgo }
        })
            .sort({ createdAt: -1 }); // Newest first
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const createNotification = async (req, res) => {
    try {
        // Only admins may create notifications for arbitrary recipients (spam prevention)
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can create notifications" });
        }

        const { recipient, message, type, relatedId } = req.body;
        if (!recipient || !message) {
            return res.status(400).json({ message: "recipient and message are required" });
        }

        const notification = await Notification.create({
            userId: recipient, // Map recipient from body to userId in model
            message,
            type: type || "info",
            relatedId
        });

        // Emit real-time update
        const io = req.app.get("io");
        if (io) {
            io.to(`user:${recipient}`).emit("new_notification", notification);
            console.log(`Notification emitted to user:${recipient}`);
        }

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deleteReadNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.id, isRead: true });
        res.json({ message: "Read notifications deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getUserNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteReadNotifications
};
