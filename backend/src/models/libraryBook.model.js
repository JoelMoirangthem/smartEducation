const mongoose = require("mongoose");

const libraryBookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, unique: true, sparse: true },
    category: { type: String, required: true, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    publisher: { type: String, trim: true },
    year: { type: Number },
    totalCopies: { type: Number, default: 1, min: 0 },
    availableCopies: { type: Number, default: 1, min: 0 },
    location: { type: String, trim: true }, // shelf/section
    status: {
        type: String,
        enum: ["available", "low_stock", "out_of_stock", "archived"],
        default: "available"
    }
}, { timestamps: true });

libraryBookSchema.index({ title: "text", author: "text", isbn: "text" });
libraryBookSchema.index({ category: 1 });

module.exports = mongoose.model("LibraryBook", libraryBookSchema);
