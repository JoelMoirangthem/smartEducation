const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    leaveType: {
        type: String,
        enum: ["sick", "personal", "family", "medical", "academic", "other"],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    attachments: [{ type: String }], // file URLs
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: "pending"
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewComment: { type: String, trim: true },
    reviewedAt: { type: Date }
}, { timestamps: true });

leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

leaveSchema.virtual("daysCount").get(function () {
    const diff = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
});

leaveSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Leave", leaveSchema);
