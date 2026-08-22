const Note = require("../models/note.model.js");
const Subject = require("../models/subject.model.js");
const Class = require("../models/class.model.js");
const User = require("../models/user.model.js");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const axios = require("axios");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

// Consistent storage root regardless of where the process is launched from
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// ================= UPLOAD NOTE =================
const uploadNote = async (req, res) => {
    try {
        const { title, description, subjectId } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (!subjectId) {
            return res.status(400).json({ message: "subjectId is required" });
        }

        // 1. Verify Teacher is assigned to this Subject
        const subject = await Subject.findOne({ _id: subjectId, teachers: userId });
        if (!subject) {
            return res.status(403).json({ message: "You are not authorized to upload notes for this subject" });
        }

        // --- LOCAL STORAGE STRATEGY (Alternative to Cloudinary) ---
        const listDir = path.join(UPLOADS_ROOT, "notes");

        if (!fs.existsSync(listDir)) {
            fs.mkdirSync(listDir, { recursive: true });
            console.log(">>> [UPLOAD] Created missing directory");
        }

        // Sanitize the client-supplied filename: keep the basename only, strip
        // path separators/control chars, and enforce a safe whitelist so
        // path.join can never escape uploads/notes/
        const safeName = path.basename(req.file.originalname)
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/^\.+/, '_')
            .slice(0, 120) || 'upload';
        const fileName = `${Date.now()}_${safeName}`;
        const filePath = path.join(listDir, fileName);
        if (!filePath.startsWith(listDir + path.sep)) {
            return res.status(400).json({ message: "Invalid filename" });
        }

        console.log(`>>> [UPLOAD] Attempting to write file: ${filePath}`);
        console.log(`>>> [UPLOAD] Buffer size: ${req.file.buffer?.length || 0} bytes`);

        // Write buffer to local disk (async, non-blocking)
        await fsp.writeFile(filePath, req.file.buffer);
        console.log(">>> [UPLOAD] Write operation complete.");

        // Store relative URL for accessibility (with leading slash for consistency)
        const localUrl = `/uploads/notes/${fileName}`;

        const note = await Note.create({
            title,
            description,
            fileUrl: localUrl,
            publicId: fileName, // Using fileName as identifier locally
            fileType: req.file.mimetype,
            uploadedBy: userId,
            subjectId: subjectId,
            classId: subject.classId
        });

        // Real-time emit (class room)
        const io = req.app.get("io");
        if (io) {
            io.to(`class:${subject.classId}`).emit("note_uploaded", {
                message: `New note in ${subject.name}: ${title}`,
                note
            });
        }

        res.status(201).json(note);

    } catch (error) {
        console.error("Local Ingestion Error:", error);
        res.status(500).json({ message: "Payload processing failed", error: error.message });
    }
};

// ================= GET NOTES =================
const getNotes = async (req, res) => {
    try {
        const { subjectId } = req.query;
        const { role, id: userId } = req.user;

        // Fetch live classId (JWT may be stale)
        const user = await User.findById(userId).select("classId");
        const classId = user?.classId?.toString() || null;

        let query = {};

        if (role === "student") {
            if (!classId) return res.json([]);
            query.classId = classId;
        } else if (role === "teacher") {
            // By default, teachers see notes they uploaded. 
            // If they select a subject, they see all notes for that subject.
            if (!subjectId) {
                query.uploadedBy = userId;
            }
        }
        // Admin sees all by default

        if (subjectId) {
            query.subjectId = subjectId;
        }

        const notes = await Note.find(query)
            .populate("uploadedBy", "name")
            .populate("subjectId", "name code")
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        console.error("Fetch Notes Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= MARK AS VIEWED =================
const markAsViewed = async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.user.id;

        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Note not found" });

        const updatedNote = await Note.findByIdAndUpdate(
            noteId,
            { $addToSet: { views: userId } },
            { new: true }
        );

        const io = req.app.get("io");
        if (io) {
            io.to(`class:${updatedNote.classId}`).emit("note_viewed", {
                noteId: updatedNote._id,
                views: updatedNote.views
            });
        }

        res.json({ message: "Marked as viewed", views: updatedNote.views });

    } catch (error) {
        console.error("View error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= DELETE NOTE =================
const deleteNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (note.uploadedBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (note.publicId) {
            // Attempt to delete local file first
            const localPath = path.join(UPLOADS_ROOT, "notes", note.publicId);
            if (!localPath.startsWith(path.join(UPLOADS_ROOT, "notes") + path.sep)) {
                return res.status(400).json({ message: "Invalid stored file reference" });
            }
            if (fs.existsSync(localPath)) {
                await fsp.unlink(localPath);
                console.log(`>>> [PURGE] Deleted local file: ${localPath}`);
            } else {
                // Fallback to Cloudinary if it's a remote file
                try {
                    await cloudinary.uploader.destroy(note.publicId, { resource_type: "raw" });
                } catch (ce) { }
            }
        }

        await note.deleteOne();

        const io = req.app.get("io");
        if (io) {
            io.to(`class:${note.classId}`).emit("note_deleted", note._id);
        }

        res.json({ message: "Note removed" });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= DOWNLOAD NOTE =================
const downloadNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        const { id: userId, role, classId: tokenClassId } = req.user;

        // --- Multi-Tier Access Control ---
        let hasAccess = false;
        if (role === 'admin') hasAccess = true;
        else if (note.uploadedBy.toString() === userId) hasAccess = true;
        else if (role === 'student' && tokenClassId && note.classId.toString() === tokenClassId.toString()) hasAccess = true;
        else if (role === 'teacher') {
            // Restricted: teacher must manage the note's class OR teach its subject
            const teacher = await User.findById(userId).select('managedClassIds classId assignedSubjectIds');
            const owningIds = [];
            if (teacher) {
                owningIds.push(...(teacher.managedClassIds || []).map(c => c.toString()));
                if (teacher.classId) owningIds.push(teacher.classId.toString());
            }
            const managesClass = note.classId && owningIds.includes(note.classId.toString());

            let teachesSubject = false;
            if (note.subjectId && teacher) {
                teachesSubject = (teacher.assignedSubjectIds || []).some(s => s.toString() === String(note.subjectId));
            }
            // Cross-check authoritative models too
            const [cls, subj] = await Promise.all([
                Class.findById(note.classId),
                note.subjectId ? Subject.findById(note.subjectId) : null
            ]);
            const isClassTeacher = cls && cls.classTeacher && cls.classTeacher.toString() === userId;
            const isSubjectTeacher = subj && (subj.teachers || []).some(t => t.toString() === userId);

            hasAccess = managesClass || teachesSubject || isClassTeacher || isSubjectTeacher;
        }

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied. You do not have the required academic clearance for this resource." });
        }

        if (!note.fileUrl) {
            return res.status(400).json({ message: "Resource payload contains a null pointer (File URL missing)" });
        }

        // Increment engagement metrics
        await Note.findByIdAndUpdate(note._id, {
            $addToSet: {
                downloads: userId,
                views: userId
            }
        });

        // --- UNIFIED TRANSMISSION STRATEGY (Local & Remote) ---
        if (note.fileUrl.startsWith("/uploads/")) {
            // HIGH-FIDELITY LOCAL DELIVERY
            const absolutePath = path.join(UPLOADS_ROOT, 'notes', note.publicId);
            if (!absolutePath.startsWith(path.join(UPLOADS_ROOT, 'notes') + path.sep)) {
                return res.status(400).json({ message: "Invalid stored file reference" });
            }

            console.log(`>>> [TRANSFER] Syncing file from: ${absolutePath}`);

            if (!fs.existsSync(absolutePath)) {
                console.error(`>>> [TRANSFER] Physical record MISSING: ${absolutePath}`);
                return res.status(404).json({ message: "Physical record mismatch (File not found on disk)" });
            }
            return res.download(absolutePath, `${note.title.replace(/[^a-z0-9]/gi, '_')}${path.extname(absolutePath)}`);
        } else {
            // LEGACY STREAMING PROXY FOR CLOUDINARY
            const response = await axios({
                url: note.fileUrl,
                method: "GET",
                responseType: "stream"
            });
            res.setHeader("Content-Disposition", `attachment; filename="${note.title.replace(/[^a-z0-9]/gi, '_')}"`);
            response.data.pipe(res);
        }

    } catch (error) {
        console.error("Payload Transmission Failure:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: "Academic payload broadcast failed", error: error.message });
        }
    }
};



module.exports = {
    uploadNote,
    getNotes,
    markAsViewed,
    deleteNote,
    downloadNote
};
