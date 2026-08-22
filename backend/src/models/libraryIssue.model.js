const mongoose = require("mongoose");

const libraryIssueSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryBook", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    status: {
        type: String,
        enum: ["issued", "returned", "overdue", "lost"],
        default: "issued"
    },
    fine: { type: Number, default: 0, min: 0 },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

libraryIssueSchema.index({ userId: 1, status: 1 });
libraryIssueSchema.index({ bookId: 1, status: 1 });

module.exports = mongoose.model("LibraryIssue", libraryIssueSchema);
