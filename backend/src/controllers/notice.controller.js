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

// ─── Helper: resolve a notice's audience as user ids ──────────────
// Shared by create / update / delete so realtime fan-out always
// targets exactly the people who can see the notice.
async function gatherRecipients({ target, targetRole, classId, subjectId }, excludeUserId) {
    const mongoose = require('mongoose');
    const baseQuery = {};
    if (target === 'ROLE' && targetRole && targetRole !== 'all') {
        baseQuery.role = targetRole;
    } else if (target === 'CLASS' && classId) {
        baseQuery.classId = classId;
    } else if (target === 'SUBJECT') {
        // Resolve the subject's class authoritatively — SUBJECT notices
        // may be stored without a denormalized classId
        let subjectClassId = null;
        if (subjectId) {
            const subj = await Subject.findById(subjectId).select('classId').lean();
            subjectClassId = subj?.classId || null;
        }
        if (subjectClassId) baseQuery.classId = subjectClassId;
    }
    if (excludeUserId) {
        baseQuery._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }
    const docs = await User.find(baseQuery).select('_id').lean();
    return docs.map(u => u._id);
}

// ─── CREATE ───────────────────────────────────────────────────────
const createNotice = async (req, res) => {
    try {
        const { title, content, targetType: rawTargetType, targetRole, classId, subjectId, priority, expiresAt } = req.body;
        // Normalize ONCE and use the normalized value everywhere — authz,
        // storage and recipient gathering must all agree (a raw/lowercase
        // value must never dodge the authorization checks below).
        const targetType = String(rawTargetType || 'ALL').toUpperCase();
        if (!['ALL', 'CLASS', 'SUBJECT', 'ROLE'].includes(targetType)) {
            return res.status(400).json({ error: 'Invalid targetType. Use ALL, CLASS, SUBJECT or ROLE.' });
        }
        let target = targetType;
        if (target === 'CLASS' && !classId) target = 'ALL';
        if (target === 'SUBJECT' && !subjectId) target = 'ALL';
        if (target === 'ROLE' && !targetRole) target = 'ALL';
        const createdBy = req.user.id;

        // Basic validation
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required.' });
        }

        // Only teachers and admins may create notices
        if (!['teacher', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only teachers and administrators can create notices.' });
        }

        // Authorization for CLASS
        if (target === 'CLASS' && req.user.role !== 'admin') {
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
        if (target === 'SUBJECT' && req.user.role !== 'admin') {
            const subject = await Subject.findOne({ _id: subjectId, teachers: createdBy });
            if (!subject) return res.status(403).json({ error: 'You do not teach this subject.' });
        }

        // Build notice
        const newNoticeData = {
            title,
            content,
            targetType: target,
            targetRole: target === 'ROLE' ? targetRole : 'all',
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
            recipientIds = await gatherRecipients(
                { target, targetRole, classId, subjectId },
                req.user.id || req.user._id
            );
        } catch (recErr) {
            console.error('[notice/create] error gathering recipients:', recErr.message);
        }

        safeDispatch('NOTICE_CREATED', { notice, targetType, targetRole, classId, subjectId, recipients: recipientIds, creatorId: req.user.id });

        console.log(`[notice/create] ✅ ${notice._id} created → ${recipientIds.length} recipients`);
        return res.status(201).json({ message: 'Notice created successfully', notice, targetedCount: recipientIds.length });

    } catch (error) {
        console.error('[notice/create] ❌', error);
        return res.status(500).json({ error: error.message || 'Failed to create notice' });
    }
};

// Build the same visibility query used by getNotices, for access checks
const buildVisibilityQuery = async (user) => {
    const { role, classId } = user;

    const query = { isActive: true };
    query.$or = [
        { targetType: 'ALL' },
        { targetType: 'ROLE', targetRole: { $in: [role, 'all'] } },
    ];

    if (role === 'student' && classId) {
        query.$or.push({ targetType: 'CLASS', classId });
        query.$or.push({ targetType: 'SUBJECT', classId });
    } else if (role === 'teacher') {
        const teacher = await User.findById(user.id).select('managedClassIds assignedSubjectIds');
        const managed = teacher?.managedClassIds || [];
        const assigned = teacher?.assignedSubjectIds || [];

        query.$or.push({ createdBy: user.id });
        if (managed.length > 0) {
            query.$or.push({ targetType: 'CLASS', classId: { $in: managed } });
        }
        if (assigned.length > 0) {
            query.$or.push({ targetType: 'SUBJECT', subjectId: { $in: assigned } });
            const subjects = await Subject.find({ _id: { $in: assigned } }).select('classId');
            const subClasses = subjects.map(s => s.classId).filter(id => id);
            if (subClasses.length > 0) {
                query.$or.push({ targetType: 'CLASS', classId: { $in: subClasses } });
            }
        }
    } else if (role === 'admin') {
        delete query.$or;
    }

    return query;
};

// ─── GET ALL ──────────────────────────────────────────────────────
const getNotices = async (req, res) => {
    try {
        const { parsePagination } = require('../utils/pagination');
        const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 10 });
        const { subjectId, targetType, targetRole } = req.query;

        const query = await buildVisibilityQuery(req.user);

        if (subjectId) query.subjectId = subjectId;
        if (targetType) query.targetType = targetType;
        if (targetRole) query.targetRole = targetRole;

        const [notices, total] = await Promise.all([
            Notice.find(query)
                .populate('createdBy', 'name email')
                .populate('classId', 'name')
                .populate('subjectId', 'name code')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip),
            Notice.countDocuments(query)
        ]);

        return res.status(200).json({ notices, currentPage: page, totalPages: Math.ceil(total / limit), total, limit });
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
        if (!notice.isActive && req.user.role !== 'admin') {
            return res.status(404).json({ error: 'Not found' });
        }
        // Enforce the same visibility rules as the list endpoint
        const visibilityQuery = await buildVisibilityQuery(req.user);
        const visible = await Notice.findOne({
            _id: notice._id,
            ...visibilityQuery
        });
        if (!visible) {
            return res.status(403).json({ error: 'Not authorized to view this notice' });
        }
        return res.json({ notice });
    } catch (error) {
        console.error('[notice/get-one]', error);
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

        // Re-read populated so every client receives exactly the shape
        // the list endpoint returns
        const populated = await Notice.findById(notice._id)
            .populate('createdBy', 'name email')
            .populate('classId', 'name')
            .populate('subjectId', 'name code');

        let recipients = [];
        try {
            recipients = await gatherRecipients({
                target: notice.targetType,
                targetRole: notice.targetRole,
                classId: notice.classId,
                subjectId: notice.subjectId || undefined
            }, req.user.id);
        } catch (recErr) {
            console.error('[notice/update] error gathering recipients:', recErr.message);
        }

        safeDispatch('NOTICE_UPDATED', {
            notice: populated,
            targetType: notice.targetType,
            targetRole: notice.targetRole,
            classId: notice.classId,
            recipients
        });

        return res.json({ message: 'Updated', notice: populated });
    } catch (error) {
        console.error('[notice/update]', error);
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

        let recipients = [];
        try {
            recipients = await gatherRecipients({
                target: notice.targetType,
                targetRole: notice.targetRole,
                classId: notice.classId,
                subjectId: notice.subjectId || undefined
            }, req.user.id);
        } catch (recErr) {
            console.error('[notice/delete] error gathering recipients:', recErr.message);
        }

        safeDispatch('NOTICE_DELETED', {
            noticeId: notice._id,
            targetType: notice.targetType,
            targetRole: notice.targetRole,
            classId: notice.classId,
            recipients,
            creatorId: notice.createdBy
        });

        return res.json({ message: 'Deleted', noticeId: notice._id });
    } catch (error) {
        console.error('[notice/delete]', error);
        return res.status(500).json({ error: 'Failed' });
    }
};

module.exports = { createNotice, getNotices, getNoticeById, updateNotice, deleteNotice };
