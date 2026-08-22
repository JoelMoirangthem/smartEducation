const mongoose = require("mongoose");

const transportSchema = new mongoose.Schema({
    routeName: { type: String, required: true, trim: true },
    busNumber: { type: String, required: true, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    stops: [{
        name: { type: String, required: true },
        time: { type: String }, // "08:00"
        order: { type: Number, required: true }
    }],
    monthlyFee: { type: Number, default: 0 },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Transport", transportSchema);
