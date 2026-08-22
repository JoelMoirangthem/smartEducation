const Transport = require("../models/transport.model");
const TransportAssignment = require("../models/transportAssignment.model");

// Create route (admin)
const createRoute = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can manage transport" });
        }
        const route = await Transport.create(req.body);
        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all routes
const getRoutes = async (req, res) => {
    try {
        const routes = await Transport.find({ isActive: true })
            .sort({ routeName: 1 });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Assign student to route
const assignStudent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can assign transport" });
        }
        const { transportId, studentId, pickupStop, dropStop } = req.body;
        if (!transportId || !studentId) {
            return res.status(400).json({ message: "transportId and studentId required" });
        }

        const route = await Transport.findById(transportId);
        if (!route) return res.status(404).json({ message: "Route not found" });

        const currentCount = await TransportAssignment.countDocuments({ transportId, isActive: true });
        if (currentCount >= route.capacity) {
            return res.status(400).json({ message: "Route is at full capacity" });
        }

        const assignment = await TransportAssignment.create({
            transportId, studentId, pickupStop, dropStop
        });
        res.status(201).json(assignment);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get route with assigned students
const getRouteDetails = async (req, res) => {
    try {
        const route = await Transport.findById(req.params.id);
        if (!route) return res.status(404).json({ message: "Route not found" });

        const assignments = await TransportAssignment.find({ transportId: req.params.id, isActive: true })
            .populate("studentId", "name email classId");
        res.json({ route, students: assignments, currentCapacity: assignments.length });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Remove student from route
const removeStudent = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        const assignment = await TransportAssignment.findByIdAndUpdate(
            req.params.id,
            { isActive: false, endDate: new Date() },
            { new: true }
        );
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });
        res.json({ message: "Student removed from route" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update route
const updateRoute = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        const route = await Transport.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!route) return res.status(404).json({ message: "Route not found" });
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createRoute, getRoutes, assignStudent, getRouteDetails, removeStudent, updateRoute };
