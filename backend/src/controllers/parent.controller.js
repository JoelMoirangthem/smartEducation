const Parent = require("../models/parent.model");
const User = require("../models/user.model");

// Link parent to student (admin)
const linkParent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can link parents" });
        }
        const { parentId, studentId, relationship, isPrimary } = req.body;
        if (!parentId || !studentId || !relationship) {
            return res.status(400).json({ message: "parentId, studentId, and relationship are required" });
        }

        const parent = await User.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent user not found" });
        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        const link = await Parent.findOneAndUpdate(
            { parentId, studentId },
            { relationship, isPrimary: isPrimary || false },
            { upsert: true, new: true }
        );
        res.status(201).json(link);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get children for a parent
const getMyChildren = async (req, res) => {
    try {
        const links = await Parent.find({ parentId: req.user.id })
            .populate("studentId", "name email classId role");
        res.json(links);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get parents for a student (admin only — contains parent PII)
const getStudentParents = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can view student parent details" });
        }
        const { studentId } = req.params;
        const links = await Parent.find({ studentId })
            .populate("parentId", "name email phone");
        res.json(links);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Unlink parent
const unlinkParent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can unlink parents" });
        }
        await Parent.findByIdAndDelete(req.params.id);
        res.json({ message: "Parent unlinked" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { linkParent, getMyChildren, getStudentParents, unlinkParent };
