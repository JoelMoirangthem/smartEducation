const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const jwt = require("jsonwebtoken");

// Middleware to verify Admin
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token." });
    }
};

// Apply middleware to all admin routes
router.use(verifyAdmin);

// Academic Management
router.post("/classes", adminController.createClass);
router.get("/classes", adminController.getClasses);
router.delete("/classes/:id", adminController.deleteClass);

router.post("/subjects", adminController.createSubject);
router.get("/subjects", adminController.getSubjects);
router.put("/subjects/:id", adminController.updateSubject);
router.delete("/subjects/:id", adminController.deleteSubject);

router.post("/academic-years", adminController.createAcademicYear);
router.get("/academic-years", adminController.getAcademicYears);


// Students
router.get("/students", adminController.getStudents);

// User Management
router.get("/users", adminController.getUsers);
router.put("/users/:id/update-academic", adminController.updateUserAcademic);

// System Stats
router.get("/stats", adminController.getSystemStats);

module.exports = router;
