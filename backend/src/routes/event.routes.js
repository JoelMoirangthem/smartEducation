const express = require("express");
const router = express.Router();
const { createEvent, getEvents, getUpcomingEvents, updateEvent, deleteEvent } = require("../controllers/event.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", createEvent);
router.get("/", getEvents);
router.get("/upcoming", getUpcomingEvents);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
