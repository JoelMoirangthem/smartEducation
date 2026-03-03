const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        default: "pdf"
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    visibility: {
        type: String,
        enum: ["class", "subject"],
        default: "class"
    },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downloads: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]

}, {
    timestamps: true
});

module.exports = mongoose.model("Note", noteSchema);
