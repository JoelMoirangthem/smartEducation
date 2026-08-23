const Timetable = require("../models/timetable.model");
const Subject = require("../models/subject.model");

// Create timetable entry
const createTimetable = async (req, res) => {
    try {
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, type, academicYearId } = req.body;
        if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !academicYearId) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // Check for time conflicts
        const conflict = await Timetable.findOne({
            classId, dayOfWeek,
            academicYearId,
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });
        if (conflict) {
            return res.status(400).json({ message: "Time slot conflict with existing entry" });
        }

        const entry = await Timetable.create({
            classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, type, academicYearId
        });
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get timetable for a class
const getClassTimetable = async (req, res) => {
    try {
        const { classId, academicYearId } = req.query;
        const query = {};
        if (classId) query.classId = classId;
        if (academicYearId) query.academicYearId = academicYearId;

        // If teacher, only show their classes
        if (req.user.role === "teacher") {
            query.teacherId = req.user.id;
        }

        const entries = await Timetable.find(query)
            .populate("subjectId", "name code")
            .populate("teacherId", "name")
            .populate("classId", "name section")
            .sort({ dayOfWeek: 1, startTime: 1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get today's schedule
const getTodaySchedule = async (req, res) => {
    try {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const today = days[new Date().getDay()];

        const query = { dayOfWeek: today };
        if (req.user.role === "student") {
            const User = require("../models/user.model");
            const student = await User.findById(req.user.id).select("classId");
            if (student?.classId) query.classId = student.classId;
        } else if (req.user.role === "teacher") {
            query.teacherId = req.user.id;
        }

        const entries = await Timetable.find(query)
            .populate("subjectId", "name code")
            .populate("teacherId", "name")
            .sort({ startTime: 1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const TIMETABLE_ALLOWED = ["classId","subjectId","teacherId","dayOfWeek","startTime","endTime","room","type","academicYearId"];
const pickTimetable = (b)=>{const o={}; for(const k of TIMETABLE_ALLOWED) if(b[k]!==undefined) o[k]=b[k]; return o;};
// Update timetable entry
const updateTimetable = async (req, res) => {
    try {
        if (!["admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only admins can update timetable" });
        }
        const entry = await Timetable.findByIdAndUpdate(req.params.id, pickTimetable(req.body), { new: true });
        if (!entry) return res.status(404).json({ message: "Entry not found" });
        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete timetable entry
const deleteTimetable = async (req, res) => {
    try {
        if (!["admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only admins can delete timetable" });
        }
        await Timetable.findByIdAndDelete(req.params.id);
        res.json({ message: "Entry deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createTimetable, getClassTimetable, getTodaySchedule, updateTimetable, deleteTimetable };
