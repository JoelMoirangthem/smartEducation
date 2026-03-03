const Notice = require('../models/notice.model');
const User = require('../models/user.model');
const Subject = require('../models/subject.model');
const Class = require('../models/class.model');
const { getDispatcher } = require('../events/dispatcher');

// ─── Helper: emit safely, never crash the HTTP handler ────────────
function safeDispatch(eventName, payload) {
    try {
        getDispatcher().emit(eventName, payload);
    } catch (err) {
        console.warn(`[notice] dispatcher not ready: ${err.message}`);
    }
}

// ─── CREATE ───────────────────────────────────────────────────────
const createNotice = async (req, res) => {
    try {
        console.log('[notice/create] body:', JSON.stringify(req.body));
        const { title, content, targetType, targetRole, classId, subjectId, priority, expiresAt } = req.body;
        const createdBy = req.user.id;

        // Basic validation
        if (!title || !content || !targetType) {
            return res.status(400).json({ error: 'Title, content and targetType are required.' });
        }
        if (targetType === 'CLASS' && !classId) return res.status(400).json({ error: 'Please select a class to broadcast to.' });
        if (targetType === 'SUBJECT' && !subjectId) return res.status(400).json({ error: 'Please select a subject to broadcast to.' });
        if (targetType === 'ROLE' && !targetRole) return res.status(400).json({ error: 'Please select a role to broadcast to.' });

        // Authorization for CLASS
        if (targetType === 'CLASS' && req.user.role !== 'admin') {
            const [isDirectClassTeacher, isSubjectTeacher, isPrimaryClassTeacher] = await Promise.all([
                User.findOne({ _id: createdBy, classId }),
                Subject.findOne({ classId, teachers: createdBy }),
                Class.findOne({ _id: classId, classTeacher: createdBy }),
            ]);
            if (!isDirectClassTeacher && !isSubjectTeacher && !isPrimaryClassTeacher) {
                console.warn(`[notice/create] teacher ${createdBy} not authorized for class ${classId}`);
                return res.status(403).json({ error: 'You are not assigned to this class. Ask an admin to assign you.' });
            }
        }

        // Authorization for SUBJECT
        if (targetType === 'SUBJECT' && req.user.role !== 'admin') {
            const subject = await Subject.findOne({ _id: subjectId, teachers: createdBy });
            if (!subject) return res.status(403).json({ error: 'You do not teach this subject.' });
        }

        // Build notice
        const newNoticeData = {
            title,
            content,
            targetType,
            targetRole: targetType === 'ROLE' ? targetRole : 'all',
            createdBy,
            priority: priority || 'medium',
        };
        if (expiresAt) newNoticeData.expiresAt = expiresAt;
        if (classId) newNoticeData.classId = classId;
        if (subjectId) newNoticeData.subjectId = subjectId;

        const notice = await Notice.create(newNoticeData);
        await notice.populate('createdBy', 'name email');
        if (newNoticeData.classId) await notice.populate('classId', 'name section');
        if (newNoticeData.subjectId) await notice.populate('subjectId', 'name code');

        // Gather recipients (Skip the producer!)
        let recipientIds = [];
        try {
            const mongoose = require('mongoose');
            const creatorId = req.user.id || req.user._id;
            const creatorObjectId = new mongoose.Types.ObjectId(creatorId);

            const baseQuery = {};
            if (targetType === 'ROLE' && targetRole && targetRole !== 'all') {
                baseQuery.role = targetRole;
            } else if (targetType === 'CLASS' && classId) {
                baseQuery.classId = classId;
            } else if (targetType === 'SUBJECT') {
                baseQuery.classId = classId || (notice.classId?._id || notice.classId);
            }

            // Always exclude the producer
            recipientIds = (await User.find({
                ...baseQuery,
                _id: { $ne: creatorObjectId }
            }).select('_id')).map(u => u._id);
        } catch (recErr) {
            console.error('[notice/create] error gathering recipients:', recErr.message);
        }

        safeDispatch('NOTICE_CREATED', { notice, targetType, targetRole, classId, subjectId, recipients: recipientIds });

        console.log(`[notice/create] ✅ ${notice._id} created → ${recipientIds.length} recipients`);
        return res.status(201).json({ message: 'Notice created successfully', notice, targetedCount: recipientIds.length });

    } catch (error) {
        console.error('[notice/create] ❌', error);
        return res.status(500).json({ error: error.message || 'Failed to create notice' });
    }
};

// ─── GET ALL ──────────────────────────────────────────────────────
const getNotices = async (req, res) => {
    try {
        const { role, classId } = req.user;
        const { page = 1, limit = 10, subjectId, targetType, targetRole } = req.query;

        const query = { isActive: true };
        query.$or = [
            { targetType: 'ALL' },
            { targetType: 'ROLE', targetRole: { $in: [role, 'all'] } },
        ];

        if (role === 'student' && classId) {
            query.$or.push({ targetType: 'CLASS', classId });
            query.$or.push({ targetType: 'SUBJECT', classId });
        } else if (role === 'teacher') {
            // High-performance mapping: use plural portfolios
            const teacher = await User.findById(req.user.id).select('managedClassIds assignedSubjectIds');
            const managed = teacher?.managedClassIds || [];
            const assigned = teacher?.assignedSubjectIds || [];

            query.$or.push({ createdBy: req.user.id });
            if (managed.length > 0) {
                query.$or.push({ targetType: 'CLASS', classId: { $in: managed } });
            }
            if (assigned.length > 0) {
                // For subjects, we can match direct subjects
                query.$or.push({ targetType: 'SUBJECT', subjectId: { $in: assigned } });
                // Also optionally match any class that those subjects belong to
                const subjects = await Subject.find({ _id: { $in: assigned } }).select('classId');
                const subClasses = subjects.map(s => s.classId).filter(id => id);
                if (subClasses.length > 0) {
                    query.$or.push({ targetType: 'CLASS', classId: { $in: subClasses } });
                }
            }
        } else if (role === 'admin') {
            // Admins can see all notices
            delete query.$or;
        }

        if (subjectId) query.subjectId = subjectId;
        if (targetType) query.targetType = targetType;
        if (targetRole) query.targetRole = targetRole;

        const notices = await Notice.find(query)
            .populate('createdBy', 'name email')
            .populate('classId', 'name')
            .populate('subjectId', 'name code')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notice.countDocuments(query);

        return res.status(200).json({ notices, currentPage: parseInt(page), totalPages: Math.ceil(total / limit), total });
    } catch (error) {
        console.error('[notice/get]', error);
        return res.status(500).json({ error: 'Failed to fetch notices' });
    }
};

// ─── GET ONE ──────────────────────────────────────────────────────
const getNoticeById = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('classId', 'name')
            .populate('subjectId', 'name code');
        if (!notice) return res.status(404).json({ error: 'Not found' });
        return res.json({ notice });
    } catch (error) {
        return res.status(500).json({ error: 'Failed' });
    }
};

// ─── UPDATE ───────────────────────────────────────────────────────
const updateNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ error: 'Not found' });
        if (req.user.role !== 'admin' && notice.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { title, content, priority, expiresAt } = req.body;
        notice.title = title || notice.title;
        notice.content = content || notice.content;
        notice.priority = priority || notice.priority;
        notice.expiresAt = expiresAt || notice.expiresAt;
        await notice.save();
        return res.json({ message: 'Updated', notice });
    } catch (error) {
        return res.status(500).json({ error: 'Failed' });
    }
};

// ─── DELETE (soft) ────────────────────────────────────────────────
const deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ error: 'Not found' });
        if (req.user.role !== 'admin' && notice.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        notice.isActive = false;
        await notice.save();
        return res.json({ message: 'Deleted' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed' });
    }
};

module.exports = { createNotice, getNotices, getNoticeById, updateNotice, deleteNotice };
