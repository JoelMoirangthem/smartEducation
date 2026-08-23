const EventEmitter = require('events');
const Notification = require('../models/notification.model');

class EventDispatcher extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.setupHandlers();
    }

    // ─── Shared notice audience resolution ──────────────────────────
    // Create, update and delete MUST reach the exact same rooms so every
    // connected client stays in sync no matter which mutation occurred.
    broadcastNoticeEvent(eventName, payload, { targetType, targetRole, classId, recipients, creatorId } = {}) {
        const type = String(targetType || 'ALL').toUpperCase();

        if (type === 'ALL') {
            this.io.emit(eventName, payload);
            return;
        }

        // Mirror to the creator's personal room so their other tabs/devices
        // reflect the change without a manual refresh (not needed for ALL - global already covers it)
        if (creatorId) {
            this.io.to(`user:${creatorId.toString()}`).emit(eventName, payload);
        }

        let roomBroadcast = false;
        if (type === 'CLASS' && classId) {
            this.io.to(`class:${classId.toString()}`).emit(eventName, payload);
            console.log(`📡 Broadcasted ${eventName} to class room: class:${classId}`);
            roomBroadcast = true;
        }
        else if (type === 'ROLE' && targetRole && targetRole !== 'all') {
            this.io.to(`role:${targetRole}`).emit(eventName, payload);
            console.log(`📡 Broadcasted ${eventName} to role room: role:${targetRole}`);
            roomBroadcast = true;
        }

        // Fallback: individual emits when rooms didn't cover the audience
        // (e.g. SUBJECT-targeted notices resolve recipients per class)
        if (!roomBroadcast && recipients && recipients.length > 0) {
            recipients.forEach(uid => {
                this.io.to(`user:${uid.toString()}`).emit(eventName, payload);
            });
            console.log(`📡 Individual emits for ${eventName}: ${recipients.length}`);
        }
    }

    setupHandlers() {
        // 📊 MARKS_UPLOADED event
        this.on('MARKS_UPLOADED', async (data) => {
            try {
                console.log('📊 Event: MARKS_UPLOADED', data);

                // 1. Create notification entry in DB
                const notification = await Notification.create({
                    userId: data.studentId,
                    type: 'marks_uploaded',
                    message: `New marks uploaded for ${data.subjectName}: ${data.marksObtained}/${data.maxMarks}`,
                    metadata: {
                        marksId: data.marksId,
                        subjectId: data.subjectId,
                        examType: data.examType,
                        subjectName: data.subjectName,
                        marksObtained: data.marksObtained,
                        maxMarks: data.maxMarks
                    }
                });

                // 2. Emit to specific student room
                const studentRoom = `user:${data.studentId}`;

                // Emit for the side notifications (toast)
                this.io.to(studentRoom).emit('marks_uploaded', {
                    subjectName: data.subjectName,
                    marksObtained: data.marksObtained,
                    maxMarks: data.maxMarks,
                    percentage: ((data.marksObtained / data.maxMarks) * 100).toFixed(2),
                    examType: data.examType
                });

                // Emit for the notification bell
                this.io.to(studentRoom).emit('new_notification', notification);

                console.log(`✅ Real-time marks notification sent to ${studentRoom}`);
            } catch (error) {
                console.error('❌ Error in MARKS_UPLOADED handler:', error);
            }
        });

        // 📢 NOTICE_CREATED event
        this.on('NOTICE_CREATED', async (data) => {
            try {
                const { notice, targetType, targetRole, classId, subjectId, recipients, creatorId } = data;
                console.log(`[socket/Notice] Dispatching for Type: ${targetType}, Target: ${classId || targetRole || 'ALL'}`);

                // Ensure notice is ready for broadcast
                if (!notice.title) {
                    console.error('[socket/Notice] ❌ Notice object is incomplete!');
                    return;
                }

                // 1. Real-time Socket Delivery (PRIORITY - "On the spot")
                this.broadcastNoticeEvent('notice_created', notice, {
                    targetType, targetRole, classId, recipients, creatorId
                });

                // 2. DB Persistence (notifications in the bell icon)
                // FINAL FILTER: Ensure the creator NEVER gets a record in the bell tray
                const effectiveCreatorId = creatorId?.toString() || (notice.createdBy?._id || notice.createdBy)?.toString();
                const filteredRecipients = (recipients || []).filter(uid => uid.toString() !== effectiveCreatorId);

                if (filteredRecipients.length > 0) {
                    const notifications = filteredRecipients.map(studentId => ({
                        userId: studentId,
                        type: 'notice',
                        message: notice.title,
                        metadata: {
                            noticeId: notice._id,
                            priority: notice.priority,
                            content: notice.content,
                            createdBy: notice.createdBy?.name || 'Admin',
                            creatorId: effectiveCreatorId
                        }
                    }));

                    Notification.insertMany(notifications).then(inserted => {
                        console.log(`✅ DB: Saved ${inserted.length} notifications`);
                        // Emit count update to individuals (filtered list only!)
                        filteredRecipients.forEach((uid, idx) => {
                            this.io.to(`user:${uid.toString()}`).emit('new_notification', inserted[idx]);
                        });
                    }).catch(err => console.error('❌ DB Notification Error:', err));
                }

                console.log(`✅ Real-time dispatch complete for notice: ${notice._id}`);
            } catch (error) {
                console.error('❌ Error in NOTICE_CREATED handler:', error);
            }
        });

        // ✏️ NOTICE_UPDATED event — keeps every visible copy in sync
        this.on('NOTICE_UPDATED', async (data) => {
            try {
                const { notice, targetType, targetRole, classId, recipients } = data;
                if (!notice?._id) {
                    console.error('[socket/Notice] ❌ NOTICE_UPDATE payload is incomplete!');
                    return;
                }
                console.log(`[socket/Notice] Update dispatched for: ${notice._id}`);
                this.broadcastNoticeEvent('notice_updated', notice, {
                    targetType,
                    targetRole,
                    classId,
                    recipients,
                    creatorId: notice.createdBy?._id || notice.createdBy
                });
            } catch (error) {
                console.error('❌ Error in NOTICE_UPDATED handler:', error);
            }
        });

        // 🗑️ NOTICE_DELETED event — removes the card everywhere instantly
        this.on('NOTICE_DELETED', async (data) => {
            try {
                const { noticeId, targetType, targetRole, classId, recipients, creatorId } = data;
                if (!noticeId) {
                    console.error('[socket/Notice] ❌ NOTICE_DELETE payload is incomplete!');
                    return;
                }
                console.log(`[socket/Notice] Delete dispatched for: ${noticeId}`);
                this.broadcastNoticeEvent('notice_deleted', { noticeId }, {
                    targetType,
                    targetRole,
                    classId,
                    recipients,
                    creatorId
                });
            } catch (error) {
                console.error('❌ Error in NOTICE_DELETED handler:', error);
            }
        });

        // 🤖 AI_ANALYSIS_TRIGGERED event
        this.on('AI_ANALYSIS_TRIGGERED', async (data) => {
            console.log('🤖 AI Analysis triggered for:', data);
            // Future AI Logic
        });
    }
}

let dispatcherInstance = null;

function createDispatcher(io) {
    if (!dispatcherInstance) {
        dispatcherInstance = new EventDispatcher(io);
    }
    return dispatcherInstance;
}

function getDispatcher() {
    if (!dispatcherInstance) {
        throw new Error('Event dispatcher not initialized. Call createDispatcher(io) first.');
    }
    return dispatcherInstance;
}

module.exports = { createDispatcher, getDispatcher };
