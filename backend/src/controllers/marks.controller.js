const Mark = require('../models/mark.model');
const Subject = require('../models/subject.model');
const User = require('../models/user.model');
const Class = require('../models/class.model');
const { getDispatcher } = require('../events/dispatcher');

// Upload marks (single or multiple students)
const uploadMarks = async (req, res) => {
    try {
        const { classId, subjectId, examType, marks: studentsMarks } = req.body;
        const teacherId = req.user.id;

        if (!classId || !subjectId || !examType || !studentsMarks || studentsMarks.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Authorization and validation (Batch optimized)
        const subject = await Subject.findById(subjectId).populate('classId');
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (!subject.teachers.some(id => id.toString() === teacherId)) {
            return res.status(403).json({ error: 'Unauthorized subject access' });
        }
        if (subject.classId._id.toString() !== classId) {
            return res.status(400).json({ error: 'Subject/Class mismatch' });
        }

        // 2. Fetch all student data in this class at once
        const studentIds = studentsMarks.map(m => m.studentId);
        const validStudents = await User.find({ _id: { $in: studentIds }, classId, role: 'student' }).select('_id name');
        const validStudentMap = new Map(validStudents.map(s => [s._id.toString(), s]));

        // 3. Fetch existing marks for reconciliation
        const existingMarks = await Mark.find({
            studentId: { $in: studentIds },
            subjectId,
            examType
        });
        const existingMarksMap = new Map(existingMarks.map(m => [m.studentId.toString(), m]));

        const savedMarks = [];
        const errors = [];
        const dispatcher = getDispatcher();

        // 4. Prepare operations
        const ops = studentsMarks.map(markData => {
            const { studentId, marksObtained, maxMarks, feedback } = markData;

            if (!validStudentMap.has(studentId)) {
                errors.push({ studentId, error: 'Student not found or class mismatch' });
                return null;
            }

            const existing = existingMarksMap.get(studentId);
            const markUpdate = {
                studentId,
                classId,
                subjectId,
                examType,
                marksObtained,
                maxMarks,
                feedback,
                updatedBy: teacherId
            };

            if (existing) {
                return {
                    updateOne: {
                        filter: { _id: existing._id },
                        update: { $set: markUpdate }
                    }
                };
            } else {
                markUpdate.uploadedBy = teacherId;
                return {
                    insertOne: { document: markUpdate }
                };
            }
        }).filter(op => op !== null);

        // 5. Execute Bulk Write
        if (ops.length > 0) {
            const result = await Mark.bulkWrite(ops);

            // Note: bulkWrite doesn't return full documents. We'll emit events with provided data.
            // For a small number of students, we can still emit individual events.
            studentsMarks.forEach(m => {
                if (validStudentMap.has(m.studentId)) {
                    dispatcher.emit('MARKS_UPLOADED', {
                        studentId: m.studentId,
                        subjectId,
                        subjectName: subject.name,
                        marksObtained: m.marksObtained,
                        maxMarks: m.maxMarks,
                        examType,
                        triggerAI: false
                    });
                }
            });
        }

        res.status(200).json({
            message: 'Marks upload synchronized',
            success: ops.length,
            failed: errors.length,
            errors
        });

    } catch (error) {
        console.error('Bulk Upload Error:', error);
        res.status(500).json({ error: 'Failed to process bulk marks' });
    }
};

// Get marks for a specific student
const getStudentMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Authorization: students can only see own marks, teachers/admins can see any
        if (userRole === 'student' && studentId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const marks = await Mark.find({ studentId })
            .populate('subjectId', 'name code')
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ marks });

    } catch (error) {
        console.error('Error fetching student marks:', error);
        res.status(500).json({ error: 'Failed to fetch marks' });
    }
};

// Get all marks for a class (teacher/admin only)
const getClassMarks = async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectId, examType } = req.query;

        const query = { classId };
        if (subjectId) query.subjectId = subjectId;
        if (examType) query.examType = examType;

        const marks = await Mark.find(query)
            .populate('studentId', 'name email')
            .populate('subjectId', 'name code')
            .populate('uploadedBy', 'name')
            .sort({ studentId: 1, createdAt: -1 });

        // Calculate statistics
        const stats = {
            totalStudents: new Set(marks.map(m => m.studentId._id.toString())).size,
            average: marks.reduce((sum, m) => sum + (m.marksObtained / m.maxMarks * 100), 0) / marks.length || 0,
            highest: Math.max(...marks.map(m => m.marksObtained / m.maxMarks * 100)),
            lowest: Math.min(...marks.map(m => m.marksObtained / m.maxMarks * 100))
        };

        res.status(200).json({ marks, stats });

    } catch (error) {
        console.error('Error fetching class marks:', error);
        res.status(500).json({ error: 'Failed to fetch class marks' });
    }
};

// Update marks (teacher/admin only)
const updateMarks = async (req, res) => {
    try {
        const { id } = req.params;
        const { marksObtained, maxMarks, feedback } = req.body;
        const teacherId = req.user.id;

        const mark = await Mark.findById(id).populate('subjectId');
        if (!mark) {
            return res.status(404).json({ error: 'Marks not found' });
        }

        // Authorization: only uploader or admin can update
        if (req.user.role !== 'admin' && mark.uploadedBy.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized to update these marks' });
        }

        mark.marksObtained = marksObtained;
        mark.maxMarks = maxMarks;
        mark.feedback = feedback;
        mark.updatedBy = teacherId;
        await mark.save();

        res.status(200).json({ message: 'Marks updated successfully', mark });

    } catch (error) {
        console.error('Error updating marks:', error);
        res.status(500).json({ error: 'Failed to update marks' });
    }
};

// Delete marks (admin only)
const deleteMarks = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete marks' });
        }

        const mark = await Mark.findByIdAndDelete(id);
        if (!mark) {
            return res.status(404).json({ error: 'Marks not found' });
        }

        res.status(200).json({ message: 'Marks deleted successfully' });

    } catch (error) {
        console.error('Error deleting marks:', error);
        res.status(500).json({ error: 'Failed to delete marks' });
    }
};

module.exports = {
    uploadMarks,
    getStudentMarks,
    getClassMarks,
    updateMarks,
    deleteMarks
};
