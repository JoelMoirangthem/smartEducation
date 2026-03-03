const express = require("express");
const authRoutes = require("./auth.routes.js");
const userRoutes = require("./user.routes.js");
const notificationRoutes = require("./notification.routes.js");
const noteRoutes = require("./note.routes.js");
const attendanceRoutes = require("./attendance.routes.js");
const markRoutes = require("./mark.routes.js");
const noticeRoutes = require("./notice.routes.js");
const faceAttendanceRoutes = require("./faceAttendance.routes.js");

const router = express.Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/user", userRoutes);
router.use("/v1/notifications", notificationRoutes);
router.use("/v1/notes", noteRoutes);
router.use("/v1/attendance", attendanceRoutes);
router.use("/v1/marks", markRoutes);
router.use("/v1/notices", noticeRoutes);
router.use("/v1/ai", require("./ai.routes"));
router.use("/v1/admin", require("./admin.routes"));
router.use("/v1/face-attendance", faceAttendanceRoutes);

module.exports = router;
