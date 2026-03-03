const Note = require("../models/note.model.js");
const Subject = require("../models/subject.model.js");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

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
        const projectRoot = process.cwd();
        const listDir = path.join(projectRoot, "uploads", "notes");

        console.log(`>>> [UPLOAD] Project Root: ${projectRoot}`);
        console.log(`>>> [UPLOAD] Targeting Directory: ${listDir}`);

        if (!fs.existsSync(listDir)) {
            fs.mkdirSync(listDir, { recursive: true });
            console.log(">>> [UPLOAD] Created missing directory");
        }

        const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const filePath = path.join(listDir, fileName);

        console.log(`>>> [UPLOAD] Attempting to write file: ${filePath}`);
        console.log(`>>> [UPLOAD] Buffer size: ${req.file.buffer?.length || 0} bytes`);

        // Write buffer to local disk
        fs.writeFileSync(filePath, req.file.buffer);
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
        const { classId, role, id: userId } = req.user;

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
            const localPath = path.join(process.cwd(), "uploads", "notes", note.publicId);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
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
            // Allow teachers to download materials to facilitate academic review/collaboration
            hasAccess = true;
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
            const relPath = note.fileUrl.startsWith("/") ? note.fileUrl.slice(1) : note.fileUrl;
            const absolutePath = path.join(process.cwd(), relPath);

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
