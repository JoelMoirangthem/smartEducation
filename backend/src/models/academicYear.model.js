const mongoose = require("mongoose");

const academicYearSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true // e.g., "2023-2024"
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isCurrent: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ensure only one year is current? 
// We can handle that in the controller logic mainly.

const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);
module.exports = AcademicYear;
