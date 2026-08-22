const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    eventType: {
        type: String,
        enum: ["academic", "cultural", "sports", "meeting", "holiday", "exam", "other"],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String, trim: true },
    targetAudience: {
        type: String,
        enum: ["all", "students", "teachers", "parents", "admin"],
        default: "all"
    },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    isPublic: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [{ type: String }]
}, { timestamps: true });

eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ eventType: 1 });

module.exports = mongoose.model("Event", eventSchema);
