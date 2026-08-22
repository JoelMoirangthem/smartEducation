const express = require("express");
const router = express.Router();
const { createTimetable, getClassTimetable, getTodaySchedule, updateTimetable, deleteTimetable } = require("../controllers/timetable.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", createTimetable);
router.get("/", getClassTimetable);
router.get("/today", getTodaySchedule);
router.put("/:id", updateTimetable);
router.delete("/:id", deleteTimetable);

module.exports = router;
