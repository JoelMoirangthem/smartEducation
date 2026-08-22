const express = require("express");
const router = express.Router();
const { createExam, getExams, getUpcomingExams, updateExam, deleteExam } = require("../controllers/exam.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", createExam);
router.get("/", getExams);
router.get("/upcoming", getUpcomingExams);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);

module.exports = router;
