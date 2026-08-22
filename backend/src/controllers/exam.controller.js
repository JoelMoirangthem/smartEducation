const Exam = require("../models/exam.model");

// Create exam
const createExam = async (req, res) => {
    try {
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        const { name, examType, subjectId, classId, academicYearId, date, startTime, endTime, totalMarks, passingMarks, venue, instructions } = req.body;
        if (!name || !examType || !subjectId || !classId || !academicYearId || !date || !startTime || !endTime || !totalMarks || !passingMarks) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        if (passingMarks > totalMarks) {
            return res.status(400).json({ message: "Passing marks cannot exceed total marks" });
        }
        const exam = await Exam.create({
            name, examType, subjectId, classId, academicYearId, date, startTime, endTime,
            totalMarks, passingMarks, venue, instructions, createdBy: req.user.id
        });
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get exams (filtered by role)
const getExams = async (req, res) => {
    try {
        const { classId, subjectId, examType, academicYearId } = req.query;
        let query = {};
        if (classId) query.classId = classId;
        if (subjectId) query.subjectId = subjectId;
        if (examType) query.examType = examType;
        if (academicYearId) query.academicYearId = academicYearId;

        const exams = await Exam.find(query)
            .populate("subjectId", "name code")
            .populate("classId", "name section")
            .sort({ date: 1 });
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get upcoming exams for student
const getUpcomingExams = async (req, res) => {
    try {
        const User = require("../models/user.model");
        const student = await User.findById(req.user.id).select("classId");
        if (!student?.classId) return res.json([]);

        const exams = await Exam.find({
            classId: student.classId,
            date: { $gte: new Date() },
            isActive: true
        })
            .populate("subjectId", "name code")
            .sort({ date: 1 })
            .limit(10);
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update exam
const updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        if (req.user.role !== "admin" && exam.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        Object.assign(exam, req.body);
        await exam.save();
        res.json(exam);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete exam
const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        if (req.user.role !== "admin" && exam.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        await exam.deleteOne();
        res.json({ message: "Exam deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createExam, getExams, getUpcomingExams, updateExam, deleteExam };
