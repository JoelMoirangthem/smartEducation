const mongoose = require("mongoose");

const markSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    examType: {
        type: String,
        required: true,
        enum: ["unit1", "unit2", "midterm", "final", "quiz", "assignment"],
        default: "quiz"
    },
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        required: true,
        min: 1
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    feedback: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes for fast querying
markSchema.index({ studentId: 1, subjectId: 1, examType: 1 }, { unique: true, partialFilterExpression: { studentId: { $exists: true } } });
markSchema.index({ classId: 1, subjectId: 1 });

// Virtual for percentage
markSchema.virtual('percentage').get(function () {
    return (this.marksObtained / this.maxMarks) * 100;
});

const Mark = mongoose.model("Mark", markSchema);
module.exports = Mark;
