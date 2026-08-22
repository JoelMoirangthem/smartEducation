const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
    try {
        const { name, email, password, role, classId, subjectIds, academicYearId } = req.body;
        const allowedRoles = ["admin", "teacher", "student"];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role. Choose admin, teacher or student." });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const publicRegEnabled = process.env.ALLOW_PUBLIC_REGISTRATION === "true";

        if (role === "admin") {
            // Admin accounts are bootstrap-only: only the very first admin can self-register.
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount > 0) {
                return res.status(403).json({ message: "Admin account already exists. Contact your administrator." });
            }
        } else if (!publicRegEnabled) {
            // Teacher/student self-registration is opt-in via ALLOW_PUBLIC_REGISTRATION=true
            return res.status(403).json({
                message: "Self-registration is disabled. Ask an administrator to create your account, or enable ALLOW_PUBLIC_REGISTRATION=true."
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // subjectIds can be an array or a single string (teachers)
        const finalSubjectIds = Array.isArray(subjectIds) ? subjectIds : (subjectIds ? [subjectIds] : []);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            classId: (role === "student" || role === "teacher") ? classId || undefined : undefined,
            managedClassIds: (role === "teacher" && classId) ? [classId] : [],
            assignedSubjectIds: (role === "teacher") ? finalSubjectIds : [],
            academicYearId: (role === "student") ? academicYearId || undefined : undefined
        });

        // Link teacher to class as "Class Teacher"
        if (role === "teacher" && classId) {
            const Class = require("../models/class.model.js");
            await Class.findByIdAndUpdate(classId, { classTeacher: user._id });
        }

        // Link teacher to subjects
        if (role === "teacher" && finalSubjectIds.length > 0) {
            const Subject = require("../models/subject.model.js");
            await Subject.updateMany(
                { _id: { $in: finalSubjectIds } },
                { $addToSet: { teachers: user._id } }
            );
        }

        res.status(201).json({
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
            user: { id: user._id, name, email, role }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// Admin only: Create Teacher or Student accounts
const adminCreateUser = async (req, res) => {
    try {
        const { name, email, password, role, classId, subjectIds, academicYearId } = req.body;

        // subjectIds can be an array or a single string
        const finalSubjectIds = Array.isArray(subjectIds) ? subjectIds : (subjectIds ? [subjectIds] : []);

        // Security check
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

        if (!["teacher", "student"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Admin can only create teachers or students." });
        }

        const Class = require("../models/class.model.js");
        const assignedClassId = ["teacher", "student"].includes(role) ? classId : null;
        if (!assignedClassId) {
            return res.status(400).json({ message: "Class assignment is required. Assign the member to a class before registering." });
        }
        const targetClass = await Class.findById(assignedClassId);
        if (!targetClass) {
            return res.status(400).json({ message: "Selected class does not exist." });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            classId: assignedClassId,
            managedClassIds: (role === "teacher") ? [assignedClassId] : [],
            assignedSubjectIds: (role === "teacher") ? finalSubjectIds : [],
            academicYearId: (role === "student") ? academicYearId : undefined
        });

        // Link teacher to class as "Class Teacher"
        if (role === "teacher") {
            await Class.updateOne(
                { _id: targetClass._id },
                { $set: { classTeacher: user._id } }
            );
        }

        // Link teacher to subjects
        if (role === "teacher" && finalSubjectIds.length > 0) {
            const Subject = require("../models/subject.model.js");
            await Subject.updateMany(
                { _id: { $in: finalSubjectIds } },
                { $addToSet: { teachers: user._id } }
            );
        }

        res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`, user: { id: user._id, name, email, role } });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

const login = async (req, res) => {
    try {
        const { email, password, role } = req.body; // Expect role in body
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Normalize: accounts are always stored lowercase; users may type
        // "Preeti@Gmail.com " and get a confusing "User not found" otherwise.
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Security Check: Verify Role
        // If role is provided in request (e.g. from specific login page), match it.
        if (role && user.role !== role) {
            return res.status(403).json({ message: `Access denied. You are not a ${role}.` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role,
                classId: user.classId ? user.classId.toString() : null,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        )
        res.json({
            token,
            user: {
                id: user._id,
                role: user.role,
                name: user.name,
                classId: user.classId
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { register, login, adminCreateUser };
