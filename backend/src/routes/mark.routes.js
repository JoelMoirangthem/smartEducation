const express = require("express");
const { addMark, getMarks, updateMark } = require("../controllers/mark.controller.js");
const protect = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Teacher adds a mark
router.post("/add", protect, addMark);

// Get marks (Student gets theirs, Teacher gets ones they added)
router.get("/", protect, getMarks);

// Update mark (Teacher only)
router.put("/:markId", protect, updateMark);

module.exports = router;
