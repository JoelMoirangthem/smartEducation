const mongoose = require("mongoose");

const transportAssignmentSchema = new mongoose.Schema({
    transportId: { type: mongoose.Schema.Types.ObjectId, ref: "Transport", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickupStop: { type: String, trim: true },
    dropStop: { type: String, trim: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

transportAssignmentSchema.index({ transportId: 1, isActive: 1 });
transportAssignmentSchema.index({ studentId: 1 });

module.exports = mongoose.model("TransportAssignment", transportAssignmentSchema);
