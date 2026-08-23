const bcrypt = require("bcryptjs");
const Class = require("../models/class.model");
const Subject = require("../models/subject.model");
const User = require("../models/user.model");
const AcademicYear = require("../models/academicYear.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Notice = require("../models/notice.model");
const Note = require("../models/note.model");

// --- Class Management ---

const createClass = async (req, res) => {
    try {
        const { name, code, section, academicYearId, classTeacherId } = req.body;

        const existingClass = await Class.findOne({ $or: [{ name, academicYearId }, { code }] });
        if (existingClass) {
            return res.status(400).json({ message: "Class name or code already exists" });
        }

        const newClass = await Class.create({
            name,
            code,
            section,
            academicYearId,
            classTeacher: classTeacherId
        });

        // Sync to Teacher profile if assigned
        if (classTeacherId) {
            await User.findByIdAndUpdate(classTeacherId, { $addToSet: { managedClassIds: newClass._id } });
        }

        // Emit real-time update
        const io = req.app.get("io");
        if (io) io.emit("CLASS_CREATED", newClass);

        res.status(201).json({ message: "Class created successfully", class: newClass });
    } catch (error) {
        res.status(500).json({ message: "Error creating class", error: error.message });
    }
};    const getClasses = async (req, res) => {
        try {
            const { academicYearId } = req.query;
            const query = {};
            if (academicYearId) query.academicYearId = academicYearId;
            else {
                // Default: only show classes from the current academic year
                const currentYear = await AcademicYear.findOne({ isCurrent: true });
                if (currentYear) query.academicYearId = currentYear._id;
            }
            const classes = await Class.find(query)
                .populate("classTeacher", "name email")
                .populate("academicYearId", "name");
            res.json({ classes });
        } catch (error) {
            res.status(500).json({ message: "Error fetching classes", error: error.message });
        }
    };

const deleteClass = async (req, res) => {
    try {
        const cls = await Class.findById(req.params.id);
        if (!cls) return res.status(404).json({ message: "Class not found" });

        const classId = cls._id;
        const mongoose = require("mongoose");
        const session = await mongoose.startSession();
        let useTxn = true;
        try { await session.startTransaction(); } catch { useTxn = false; }
        const opts = useTxn ? { session } : {};

        try {
            // Remove class references from users (students' classId, any teachers managing it)
            await User.updateMany(
                { $or: [{ classId }, { managedClassIds: classId }] },
                { $unset: { classId: "" }, $pull: { managedClassIds: classId } },
                opts
            );

            // Delete subjects belonging to this class and clean teacher portfolios
            const subjects = await Subject.find({ classId }).select("_id").session(useTxn ? session : null);
            const subjectIds = subjects.map(s => s._id);
            if (subjectIds.length > 0) {
                await Subject.deleteMany({ _id: { $in: subjectIds } }, opts);
                await User.updateMany(
                    { assignedSubjectIds: { $in: subjectIds } },
                    { $pull: { assignedSubjectIds: { $in: subjectIds } } },
                    opts
                );
            }

            // Delete all class-coupled records — transactional to avoid orphans
            const Mark = require("../models/mark.model");
            const Exam = require("../models/exam.model");
            const Timetable = require("../models/timetable.model");
            const Fee = require("../models/fee.model");
            await Promise.all([
                AttendanceSession.deleteMany({ classId }, opts),
                Notice.deleteMany({ classId }, opts),
                Note.deleteMany({ classId }, opts),
                Mark.deleteMany({ classId }, opts),
                Exam.deleteMany({ classId }, opts),
                Timetable.deleteMany({ classId }, opts),
                // Transport assignments / library not class-bound directly — skip
                Fee.deleteMany({ classId }, opts).catch(()=>{}),
            ]);

            await cls.deleteOne(opts);
            if (useTxn) await session.commitTransaction();
        } catch (txnErr) {
            if (useTxn) await session.abortTransaction().catch(()=>{});
            throw txnErr;
        } finally {
            session.endSession();
        }

        // Emit real-time update
        const io = req.app.get("io");
        if (io) io.emit("CLASS_DELETED", { classId: classId.toString() });

        res.json({ message: "Class deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting class", error: error.message });
    }
};

// --- Subject Management ---

const createSubject = async (req, res) => {
    try {
        const { name, code, classId, teacherId } = req.body;

        const existingSubject = await Subject.findOne({ code, classId });
        if (existingSubject) {
            return res.status(400).json({ message: "Subject code already exists in this class" });
        }

        const newSubject = await Subject.create({
            name,
            code,
            classId,
            teachers: teacherId ? [teacherId] : []
        });

        // Sync to Teacher profile if assigned
        if (teacherId) {
            await User.findByIdAndUpdate(teacherId, { $addToSet: { assignedSubjectIds: newSubject._id } });
        }

        // Emit real-time update
        const io = req.app.get("io");
        if (io) io.emit("SUBJECT_CREATED", newSubject);

        res.status(201).json({ message: "Subject created successfully", subject: newSubject });
    } catch (error) {
        res.status(500).json({ message: "Error creating subject", error: error.message });
    }
};

const getSubjects = async (req, res) => {
    try {
        const { classId, teacherId } = req.query;

        let query = {};
        if (classId) query.classId = classId;
        if (teacherId) query.teachers = teacherId;

        const subjects = await Subject.find(query)
            .populate("classId", "name")
            .populate("teachers", "name email");

        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: "Error fetching subjects", error: error.message });
    }
};    const updateSubject = async (req, res) => {
        try {
            const { id } = req.params;
            const { name, code, teacherId } = req.body;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (code !== undefined) updateData.code = code;
            if (teacherId) updateData.$addToSet = { teachers: teacherId };

            const updatedSubject = await Subject.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            ).populate("teachers", "name email");

        // Emit real-time update
        const io = req.app.get("io");
        if (io) io.emit("SUBJECT_UPDATED", updatedSubject);

        res.json({ message: "Subject updated successfully", subject: updatedSubject });
    } catch (error) {
        res.status(500).json({ message: "Error updating subject", error: error.message });
    }
};    const deleteSubject = async (req, res) => {
        try {
            const subjectId = req.params.id;

            // Cascade: remove subject references from teachers' portfolios
            await User.updateMany(
                { assignedSubjectIds: subjectId },
                { $pull: { assignedSubjectIds: subjectId } }
            );

            // Cascade: delete associated attendance sessions, marks, notes, notices
            await AttendanceSession.deleteMany({ subjectId });
            const Mark = require("../models/mark.model");
            await Mark.deleteMany({ subjectId });
            await Note.deleteMany({ subjectId });
            await Notice.deleteMany({ subjectId });

            await Subject.findByIdAndDelete(subjectId);

            // Emit real-time update
            const io = req.app.get("io");
            if (io) io.emit("SUBJECT_DELETED", { subjectId });

            res.json({ message: "Subject deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting subject", error: error.message });
        }
    };

// Get students by class
const getStudents = async (req, res) => {
    try {
        const { classId, role } = req.query;

        let query = {};
        if (classId) query.classId = classId;
        if (role) query.role = role;
        else query.role = 'student'; // Default to students

        const students = await User.find(query)
            .select('-password')
            .populate('classId', 'name');

        res.json({ students });
    } catch (error) {
        res.status(500).json({ message: "Error fetching students", error: error.message });
    }
};

// --- System Health (Dashboard) ---

const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ role: { $ne: 'admin' } }); // Example

        // Mock data for now until we have real activity tracking
        const stats = {
            totalUsers,
            activeStudents: await User.countDocuments({ role: 'student' }),
            activeTeachers: await User.countDocuments({ role: 'teacher' }),
            totalClasses: await Class.countDocuments(),
            totalSubjects: await Subject.countDocuments()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching system stats", error: error.message });
    }
}

// --- User Management (Basic) ---

const getUsers = async (req, res) => {
    try {
        console.log(">>> [Admin] Synchronizing Member Registry...");
        const users = await User.find()
            .select("-password")
            .populate("classId", "name section")
            .populate("managedClassIds", "name section")
            .populate({
                path: "assignedSubjectIds",
                select: "name code",
                populate: { path: "classId", select: "name" }
            })
            .populate("academicYearId", "name")
            .lean();

        // FAILSAFE: Map legacy fields if they exist from previous schema versions
        const enrichedUsers = users.map((u) => {
            // Self-healing: Look into the lean object for old/new names
            const classes = u.managedClassIds || u.classIds || [];
            const subjects = u.assignedSubjectIds || u.subjectIds || [];

            if (u.role === 'teacher') {
                return {
                    ...u,
                    managedClasses: classes,
                    assignedSubjects: subjects
                };
            }
            return u;
        });

        console.log(`>>> [Admin] Registry Sync Complete: Found ${enrichedUsers.length} identities.`);
        res.json(enrichedUsers);
    } catch (error) {
        console.error(">>> [Admin] Critical Registry Failure:", error);
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
}

const updateUserAcademic = async (req, res) => {
        try {
            const { name, email, role, classId, classIds, subjectIds, password } = req.body;
            const userId = req.params.id;

            // Prevent self role escalation and cannot create other admins via this endpoint
            if (userId === req.user.id) {
                return res.status(400).json({ message: "Cannot modify your own account via this endpoint. Use profile settings." });
            }
            if (role === 'admin') {
                return res.status(403).json({ message: "Cannot assign admin role via this endpoint." });
            }

            console.log(`>>> [AdminUpdate] Processing update for UID: ${userId} (${role})`);

        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Member not found in registry" });
        }

        // Apply identity updates
        if (name) user.name = name;
        if (email) user.email = email;
        user.role = role;

        // Admin-initiated password reset
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters" });
            }
            user.password = await bcrypt.hash(password, 10);
        }

        if (role === 'teacher') {
            // Unset redundant singular fields for teachers
            user.classId = undefined;
            user.set('subjectId', undefined); // Force remove if it exists in old schema

            user.managedClassIds = Array.isArray(classIds) ? classIds : [];
            user.assignedSubjectIds = Array.isArray(subjectIds) ? subjectIds : [];

            console.log(`>>> [AdminUpdate] Teacher Portfolio Sync: ${user.managedClassIds.length} Classes, ${user.assignedSubjectIds.length} Subjects`);

            // --- Bidirectional Institutional Sync ---
            // 1. Sync Class Teacher status
            await Class.updateMany({ classTeacher: userId }, { $unset: { classTeacher: "" } });
            if (user.managedClassIds.length > 0) {
                await Class.updateMany({ _id: { $in: user.managedClassIds } }, { $set: { classTeacher: userId } });
            }

            // 2. Sync Subject Teacher status
            await Subject.updateMany({ teachers: userId }, { $pull: { teachers: userId } });
            if (user.assignedSubjectIds.length > 0) {
                await Subject.updateMany({ _id: { $in: user.assignedSubjectIds } }, { $addToSet: { teachers: userId } });
            }
        } else {
            // Student/Admin logic
            user.classId = mongoose.Types.ObjectId.isValid(classId) ? classId : null;
            user.managedClassIds = [];
            user.assignedSubjectIds = [];
        }

        await user.save();
        console.log(`>>> [AdminUpdate] Successfully persisted changes for ${user.name}`);

        res.json({ message: "Professional profile synchronized successfully", user: { id: user._id, name: user.name, role: user.role } });
    } catch (error) {
        console.error(">>> [AdminUpdate] Critical failure:", error);
        res.status(500).json({ message: "Database synchronization failed", error: error.message });
    }
}

// --- Academic Year Management ---

const createAcademicYear = async (req, res) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;

        const existingYear = await AcademicYear.findOne({ name });
        if (existingYear) {
            return res.status(200).json({ message: "Academic year already exists", academicYear: existingYear });
        }

        if (isCurrent) {
            await AcademicYear.updateMany({}, { isCurrent: false });
        }

        const ay = await AcademicYear.create({ name, startDate, endDate, isCurrent });
        res.status(201).json({ message: "Academic year created", academicYear: ay });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};

const getAcademicYears = async (req, res) => {
    try {
        const academicYears = await AcademicYear.find().sort({ startDate: -1 });
        res.json({ academicYears });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};

module.exports = {
    createClass,
    getClasses,
    deleteClass,
    createSubject,
    getSubjects,
    getStudents,
    getSystemStats,
    getUsers,
    updateUserAcademic,
    createAcademicYear,
    getAcademicYears,
    updateSubject,
    deleteSubject
};
