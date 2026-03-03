const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Public registration ONLY for admins
        if (role !== "admin") {
            return res.status(403).json({ message: "Only admins can register themselves. Students and Teachers must be registered by an Admin." });
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
            role: "admin"
        });

        res.status(201).json({ message: "Admin account created successfully", user: { id: user._id, name, email, role: "admin" } });
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
            classId: (role === "student" || role === "teacher") ? classId : undefined,
            managedClassIds: (role === "teacher" && classId) ? [classId] : [],
            assignedSubjectIds: (role === "teacher") ? finalSubjectIds : [],
            academicYearId: (role === "student") ? academicYearId : undefined
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

        res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`, user: { id: user._id, name, email, role } });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

const login = async (req, res) => {
    const { email, password, role } = req.body; // Expect role in body
    const user = await User.findOne({ email });

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
            expiresIn: "1d"
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
};

module.exports = { register, login, adminCreateUser };
