const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, uploadAvatar, getStudentsByClass, getTeacherSubjects, getTeacherClasses } = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Protect all routes
router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/students", getStudentsByClass); // Teacher gets students of their class
router.get("/classes", getTeacherClasses); // Teacher gets their assigned classes
router.get("/subjects", getTeacherSubjects); // Teacher/Student gets subjects
router.post("/profile/avatar", (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large. Maximum size is 50MB." });
            }
            return res.status(400).json({ message: "File upload error", error: err.message });
        }
        next();
    });
}, uploadAvatar);

module.exports = router;
