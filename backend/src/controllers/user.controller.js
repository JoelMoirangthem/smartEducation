const User = require("../models/user.model");
const Subject = require("../models/subject.model");
const Class = require("../models/class.model");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");
// ... imports

// ... inside uploadAvatar
// Custom function to upload stream to Cloudinary
// Custom helper to upload stream to Cloudinary
const streamUpload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "avatars" },
            (error, result) => {
                if (result) resolve(result);
                else {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                }
            }
        );
        Readable.from(fileBuffer).pipe(stream);
    });
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const userId = req.user.id;

        const user = await User.findByIdAndUpdate(
            userId,
            { name, bio },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });

        const io = req.app.get("io");
        if (io) io.emit("PROFILE_UPDATED", { userId, user });

        res.json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const userId = req.user.id;
        const result = await streamUpload(req.file.buffer);

        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: result.secure_url },
            { new: true }
        ).select("-password");

        const io = req.app.get("io");
        if (io) io.emit("PROFILE_UPDATED", { userId, user });

        res.json({ message: "Avatar uploaded successfully", user });
    } catch (error) {
        console.error("Upload avatar failed:", error);
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
};

const getStudentsByClass = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const teacher = await User.findById(teacherId);

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        if (teacher.role !== 'teacher') {
            return res.status(403).json({ message: "Access denied. Teachers only." });
        }

        if (!teacher.classId) {
            return res.status(400).json({ message: "Teacher is not assigned to any class." });
        }

        const students = await User.find({ role: "student", classId: teacher.classId }).select("-password");
        res.json(students);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getTeacherSubjects = async (req, res) => {
    const mongoose = require("mongoose");
    const userId = req.user?.id;
    const rawRole = req.user?.role || "";
    const userRole = rawRole.toLowerCase().trim();

    console.log(`>>> [Attendance] Auth Context - User ID: ${userId}, Role: ${userRole}`);

    try {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid or missing User ID in session" });
        }

        const userIdObj = new mongoose.Types.ObjectId(userId);
        const user = await User.findById(userIdObj);

        if (!user) {
            return res.status(404).json({ message: "User account not found" });
        }

        const confirmedRole = user.role.toLowerCase();
        let subjects = [];

        if (confirmedRole === "teacher") {
            // Use the Subject collection as the source of truth for teacher assignments
            subjects = await Subject.find({ teachers: userIdObj })
                .populate("classId", "name section")
                .populate("teachers", "name email");

            console.log(`>>> [Subjects] Found ${subjects.length} assigned units for Teacher: ${user.name}`);
        }
        else if (confirmedRole === "student") {
            if (user.classId) {
                subjects = await Subject.find({ classId: user.classId })
                    .populate("classId", "name section")
                    .populate("teachers", "name email");
            }
        }
        else if (confirmedRole === "admin") {
            subjects = await Subject.find({})
                .populate("classId", "name section")
                .populate("teachers", "name email");
        }

        res.json(subjects);
    } catch (error) {
        console.error(">>> [Attendance] Critical failure in registry lookup:", error);
        res.status(500).json({ message: "Registry lookup failed", error: error.message });
    }
};

const getTeacherClasses = async (req, res) => {
    try {
        const teacherId = req.user.id;

        // 1. Get classes where they are the primary Class Teacher (Searching both ways for robustness)
        const primaryClasses = await Class.find({ classTeacher: teacherId });

        // 2. Get classes where they teach a subject
        const subjects = await Subject.find({ teachers: teacherId }).populate("classId", "name section");
        const subjectClasses = subjects
            .filter(s => s.classId)
            .map(s => s.classId);

        // Combine and remove duplicates
        const allClassMap = new Map();

        primaryClasses.forEach(cls => {
            allClassMap.set(cls._id.toString(), cls);
        });

        subjectClasses.forEach(cls => {
            allClassMap.set(cls._id.toString(), cls);
        });

        // Add the class from User model if it's missing (legacy support)
        const teacher = await User.findById(teacherId).populate("classId", "name section");
        if (teacher && teacher.classId && !allClassMap.has(teacher.classId._id.toString())) {
            allClassMap.set(teacher.classId._id.toString(), teacher.classId);
        }

        res.json(Array.from(allClassMap.values()));
    } catch (error) {
        console.error("Error fetching teacher classes:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar,
    getStudentsByClass,
    getTeacherSubjects,
    getTeacherClasses
};
