const express = require("express");
const router = express.Router();
const { getUserNotifications, createNotification, markAsRead, markAllAsRead, deleteReadNotifications } = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Protect all routes
router.use(authMiddleware);

router.get("/", getUserNotifications);
router.post("/", createNotification); // Exposed for testing/admin use
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/read-cleared", deleteReadNotifications);

module.exports = router;
