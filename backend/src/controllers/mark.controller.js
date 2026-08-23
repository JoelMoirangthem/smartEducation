const Mark = require("../models/mark.model");
const Subject = require("../models/subject.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

// ================= ADD MARK (Teacher Only) =================
const addMark = async (req, res) => {
    try {
        const { studentId, subjectId, examType, marksObtained, maxMarks, feedback } = req.body;
        const teacherId = req.user.id;

        // 1. Verify Teacher is assigned to this Subject
        const subject = await Subject.findOne({ _id: subjectId, teachers: teacherId });
        if (!subject) {
            return res.status(403).json({ message: "You are not authorized to upload marks for this subject" });
        }

        // 2. Validate Student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // 3. Create Mark — idempotent: update if same (student, subject, examType) already exists
        const existing = await Mark.findOne({ studentId, subjectId, examType });
        if (existing) {
            return res.status(409).json({ message: `Mark already exists for this examType. Use PUT /marks/${existing._id} to update.`, markId: existing._id });
        }
        const mark = await Mark.create({
            studentId,
            uploadedBy: teacherId,
            classId: subject.classId,
            subjectId,
            examType,
            marksObtained,
            maxMarks,
            feedback
        });

        const markPopulated = await Mark.findById(mark._id)
            .populate("studentId", "name email")
            .populate("subjectId", "name code")
            .populate("uploadedBy", "name");

        const message = `Evaluation Finalized: ${subject.name} (${examType}) — Score: ${marksObtained}/${maxMarks}`;

        try {
            await Notification.create({
                userId: studentId,
                message: message,
                type: "marks_uploaded",
                relatedId: mark._id.toString(),
                metadata: {
                    subjectName: subject.name,
                    marksObtained,
                    maxMarks,
                    examType
                }
            });
        } catch (notifErr) {
            console.error("Non-blocking notification failure:", notifErr);
        }

        const io = req.app.get("io");
        if (io) {
            const socketPayload = {
                _id: new Date().getTime(), // Temporary ID for UI
                userId: studentId,
                message: message,
                type: "marks_uploaded",
                relatedId: mark._id.toString(),
                createdAt: new Date(),
                isRead: false,
                metadata: {
                    subjectName: subject.name,
                    marksObtained,
                    maxMarks,
                    examType
                }
            };
            // Emit notification to student personal room
            io.to(`user:${studentId}`).emit("new_notification", socketPayload);
            // Emit marks update to student (personal) and class room for redundancy
            // and to teacher's other devices for live sync without refresh
            io.to(`user:${studentId}`).emit("marks_updated", markPopulated);
            if (subject.classId) io.to(`class:${subject.classId}`).emit("marks_updated", markPopulated);
            io.to(`user:${teacherId}`).emit("marks_updated", markPopulated);
        }

        res.status(201).json(markPopulated);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Duplicate mark: this student already has a mark for this examType in this subject" });
        }
        console.error("Broadcast Execution Failure:", error);
        res.status(500).json({ message: "Dissemination failure", error: error.message });
    }
};

// ================= GET MARKS (Student & Teacher) =================
const getMarks = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { subjectId } = req.query;

        let query = {};
        if (role === "student") {
            query.studentId = userId;
        } else if (role === "teacher") {
            query.uploadedBy = userId;
        }

        if (subjectId) {
            query.subjectId = subjectId;
        }

        const marks = await Mark.find(query)
            .populate("studentId", "name email")
            .populate("subjectId", "name code")
            .populate("uploadedBy", "name")
            .sort({ createdAt: -1 });

        res.json(marks);

    } catch (error) {
        console.error("Evaluation Retrieval Failure:", error);
        res.status(500).json({ message: "Failed to retrieve academic records", error: error.message });
    }
};

// ================= UPDATE MARK (Teacher Only) =================
const updateMark = async (req, res) => {
    try {
        const { markId } = req.params;
        const { marksObtained, maxMarks, feedback } = req.body;
        const teacherId = req.user.id;

        let mark = await Mark.findById(markId).populate("subjectId", "name");

        if (!mark) {
            return res.status(404).json({ message: "Mark not found" });
        }

        if (mark.uploadedBy.toString() !== teacherId) {
            return res.status(403).json({ message: "Not authorized to edit this mark" });
        }

        mark.marksObtained = marksObtained !== undefined ? marksObtained : mark.marksObtained;
        mark.maxMarks = maxMarks !== undefined ? maxMarks : mark.maxMarks;
        mark.feedback = feedback !== undefined ? feedback : mark.feedback;
        mark.updatedBy = teacherId;

        await mark.save();

        const markPopulated = await Mark.findById(mark._id)
            .populate("studentId", "name email")
            .populate("subjectId", "name code")
            .populate("uploadedBy", "name");

        const message = `Evaluation Updated: ${mark.subjectId.name} (${mark.examType}) — New Score: ${mark.marksObtained}/${mark.maxMarks}`;

        try {
            await Notification.create({
                userId: mark.studentId,
                message: message,
                type: "marks_uploaded",
                relatedId: mark._id.toString(),
                metadata: {
                    subjectName: mark.subjectId.name,
                    marksObtained: mark.marksObtained,
                    maxMarks: mark.maxMarks,
                    examType: mark.examType
                }
            });
        } catch (notifErr) {
            console.error("Non-blocking notification update failure:", notifErr);
        }

        const io = req.app.get("io");
        if (io) {
            const socketPayload = {
                _id: new Date().getTime(),
                userId: mark.studentId,
                message: message,
                type: "marks_uploaded",
                relatedId: mark._id.toString(),
                createdAt: new Date(),
                isRead: false,
                metadata: {
                    subjectName: mark.subjectId.name,
                    marksObtained: mark.marksObtained,
                    maxMarks: mark.maxMarks,
                    examType: mark.examType
                }
            };
            const studentIdStr = mark.studentId.toString();
            const classId = mark.classId || mark.subjectId?.classId;
            io.to(`user:${studentIdStr}`).emit("new_notification", socketPayload);
            io.to(`user:${studentIdStr}`).emit("marks_updated", markPopulated);
            if (classId) io.to(`class:${classId}`).emit("marks_updated", markPopulated);
            io.to(`user:${teacherId}`).emit("marks_updated", markPopulated);
        }

        res.json(markPopulated);

    } catch (error) {
        console.error("Update Dissemination Failure:", error);
        res.status(500).json({ message: "Modification broadcast failure", error: error.message });
    }
};

module.exports = {
    addMark,
    getMarks,
    updateMark
};
