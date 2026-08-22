const Event = require("../models/event.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");

// Create event (admin/teacher)
const createEvent = async (req, res) => {
    try {
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        const event = await Event.create({ ...req.body, createdBy: req.user.id });

        // Notify target audience
        let recipients = [];
        if (req.body.targetAudience === "all") {
            recipients = (await User.find({}).select("_id")).map(u => u._id);
        } else {
            const roleMap = { students: "student", teachers: "teacher", parents: "teacher" };
            recipients = (await User.find({ role: roleMap[req.body.targetAudience] || "student" }).select("_id")).map(u => u._id);
        }

        for (const uid of recipients.slice(0, 50)) { // Limit bulk notifications
            await Notification.create({
                userId: uid,
                message: `New event: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`,
                type: "info"
            });
        }

        const io = req.app.get("io");
        if (io) io.emit("event_created", event);

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get events
const getEvents = async (req, res) => {
    try {
        const { eventType, startDate, endDate } = req.query;
        let query = {};
        if (eventType) query.eventType = eventType;
        if (startDate) query.startDate = { $gte: new Date(startDate) };
        if (endDate) query.endDate = { $lte: new Date(endDate) };

        const events = await Event.find(query)
            .populate("createdBy", "name")
            .sort({ startDate: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get upcoming events
const getUpcomingEvents = async (req, res) => {
    try {
        const events = await Event.find({ startDate: { $gte: new Date() } })
            .sort({ startDate: 1 })
            .limit(10);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update event
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (req.user.role !== "admin" && event.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        Object.assign(event, req.body);
        await event.save();
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete event
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (req.user.role !== "admin" && event.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        await event.deleteOne();
        res.json({ message: "Event deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createEvent, getEvents, getUpcomingEvents, updateEvent, deleteEvent };
