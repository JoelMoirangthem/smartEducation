const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    feeId: { type: mongoose.Schema.Types.ObjectId, ref: "Fee", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: {
        type: String,
        enum: ["cash", "card", "bank_transfer", "online", "cheque"],
        default: "cash"
    },
    transactionId: { type: String },
    receiptNumber: { type: String, required: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true }
}, { timestamps: true });

paymentSchema.index({ feeId: 1 });
paymentSchema.index({ studentId: 1, createdAt: -1 });
paymentSchema.index({ receiptNumber: 1 }, { unique: true });
// Prevent double-recording of the same external/gateway transaction
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Payment", paymentSchema);
