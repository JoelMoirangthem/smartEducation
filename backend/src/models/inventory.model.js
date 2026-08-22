const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ["furniture", "electronics", "lab_equipment", "sports", "stationery", "other"],
        required: true
    },
    assetCode: { type: String, unique: true },
    quantity: { type: Number, default: 1, min: 0 },
    condition: {
        type: String,
        enum: ["new", "good", "fair", "poor", "damaged"],
        default: "new"
    },
    location: { type: String, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0 },
    warrantyExpiry: { type: Date },
    lastMaintenance: { type: Date },
    nextMaintenance: { type: Date },
    status: {
        type: String,
        enum: ["available", "in_use", "maintenance", "retired"],
        default: "available"
    },
    notes: { type: String, trim: true }
}, { timestamps: true });

inventorySchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
