const express = require("express");
const router = express.Router();

// Core modules
router.use("/v1/auth", require("./auth.routes"));
router.use("/v1/user", require("./user.routes"));
router.use("/v1/notifications", require("./notification.routes"));
router.use("/v1/notes", require("./note.routes"));
router.use("/v1/attendance", require("./attendance.routes"));
router.use("/v1/marks", require("./mark.routes"));
router.use("/v1/notices", require("./notice.routes"));
router.use("/v1/face-attendance", require("./faceAttendance.routes"));

// Academic modules
router.use("/v1/exams", require("./exam.routes"));
router.use("/v1/timetable", require("./timetable.routes"));
router.use("/v1/library", require("./library.routes"));

// Operations modules
router.use("/v1/fees", require("./fee.routes"));
router.use("/v1/transport", require("./transport.routes"));
router.use("/v1/inventory", require("./inventory.routes"));
router.use("/v1/leaves", require("./leave.routes"));
router.use("/v1/events", require("./event.routes"));
router.use("/v1/parents", require("./parent.routes"));

// AI modules (tutor chat + agent live in the Python service; sessions CRUD stays here)
router.use("/v1/ai", require("./ai.routes"));
router.use("/v1/admin", require("./admin.routes"));

// Internal relay for the Python agent's realtime side-effects
router.use("/v1/internal", require("./internal.routes"));

module.exports = router;
