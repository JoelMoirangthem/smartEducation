const EventEmitter = require('events');
const Notification = require('../models/notification.model');

class EventDispatcher extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.setupHandlers();
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
                const { notice, targetType, targetRole, classId, subjectId, recipients } = data;
                console.log(`[socket/Notice] Dispatching for Type: ${targetType}, Target: ${classId || targetRole || 'ALL'}`);

                // Ensure notice is ready for broadcast
                if (!notice.title) {
                    console.error('[socket/Notice] ❌ Notice object is incomplete!');
                    return;
                }

                // 1. Real-time Socket Delivery (PRIORITY - "On the spot")
                let roomBroadcast = false;
                if (targetType === 'CLASS' && classId) {
                    const room = `class:${classId.toString()}`;
                    this.io.to(room).emit('notice_created', notice);
                    console.log(`📡 Broadcasted to class room: ${room}`);
                    roomBroadcast = true;
                }
                else if (targetType === 'ALL') {
                    this.io.emit('notice_created', notice);
                    console.log(`📡 Global broadcast to ALL users`);
                    roomBroadcast = true;
                }
                else if (targetType === 'ROLE' && targetRole) {
                    const room = `role:${targetRole}`;
                    this.io.to(room).emit('notice_created', notice);
                    console.log(`📡 Broadcasted to role room: ${room}`);
                    roomBroadcast = true;
                }

                // Fallback: emit to specific recipients individually if rooms didn't cover it
                if (!roomBroadcast && recipients && recipients.length > 0) {
                    recipients.forEach(uid => {
                        this.io.to(`user:${uid.toString()}`).emit('notice_created', notice);
                    });
                    console.log(`📡 Individual emits: ${recipients.length}`);
                }

                // 2. DB Persistence (notifications in the bell icon)
                // FINAL FILTER: Ensure the creator NEVER gets a record in the bell tray
                const creatorId = (notice.createdBy?._id || notice.createdBy)?.toString();
                const filteredRecipients = (recipients || []).filter(uid => uid.toString() !== creatorId);

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
                            creatorId: creatorId
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
