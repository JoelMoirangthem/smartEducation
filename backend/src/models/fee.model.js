const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    feeType: {
        type: String,
        enum: ["tuition", "exam", "library", "transport", "lab", "hostel", "misc"],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ["pending", "partial", "paid", "overdue", "waived"],
        default: "pending"
    },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

feeSchema.index({ studentId: 1, academicYearId: 1 });
feeSchema.index({ status: 1, dueDate: 1 });

feeSchema.virtual("balance").get(function () {
    return this.amount - this.paidAmount;
});

feeSchema.virtual("percentagePaid").get(function () {
    return this.amount > 0 ? Math.round((this.paidAmount / this.amount) * 100) : 0;
});

feeSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Fee", feeSchema);
