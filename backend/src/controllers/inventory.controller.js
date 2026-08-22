const Inventory = require("../models/inventory.model");

// Add item (admin)
const addItem = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can manage inventory" });
        }
        const assetCode = req.body.assetCode || `INV-${Date.now().toString(36).toUpperCase()}`;
        const item = await Inventory.create({ ...req.body, assetCode });
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get inventory items
const getItems = async (req, res) => {
    try {
        const { category, status, location } = req.query;
        let query = {};
        if (category) query.category = category;
        if (status) query.status = status;
        if (location) query.location = location;

        const items = await Inventory.find(query)
            .populate("assignedTo", "name")
            .populate("classId", "name")
            .sort({ name: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update item
const updateItem = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete item
const deleteItem = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Inventory stats
const getInventoryStats = async (req, res) => {
    try {
        const stats = await Inventory.aggregate([
            {
                $group: {
                    _id: { category: "$category", status: "$status" },
                    count: { $sum: "$quantity" },
                    totalValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } }
                }
            },
            { $sort: { "_id.category": 1 } }
        ]);
        const totalItems = await Inventory.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }]);
        res.json({ byCategoryAndStatus: stats, totalItems: totalItems[0]?.total || 0 });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { addItem, getItems, updateItem, deleteItem, getInventoryStats };
