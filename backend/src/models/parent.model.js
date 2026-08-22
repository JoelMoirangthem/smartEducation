const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    relationship: {
        type: String,
        enum: ["father", "mother", "guardian", "other"],
        required: true
    },
    isPrimary: { type: Boolean, default: false },
    canReceiveNotifications: { type: Boolean, default: true }
}, { timestamps: true });

parentSchema.index({ studentId: 1 });
parentSchema.index({ parentId: 1 });
parentSchema.index({ parentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Parent", parentSchema);
