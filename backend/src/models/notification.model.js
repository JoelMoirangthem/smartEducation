const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["notice", "marks_uploaded", "attendance", "info", "warning", "success", "error"],
        default: "info"
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    relatedId: {
        type: String
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 }, { expireAfterSeconds: 604800 }); // Auto-clear after 7 days (604800 seconds)

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
