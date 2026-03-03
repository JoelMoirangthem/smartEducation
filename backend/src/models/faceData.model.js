const mongoose = require("mongoose");

const faceDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true // One face registration per user
    },
    isRegistered: {
        type: Boolean,
        default: true
    },
    imagesCount: {
        type: Number,
        required: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for quick lookups
const FaceData = mongoose.model("FaceData", faceDataSchema);
module.exports = FaceData;
