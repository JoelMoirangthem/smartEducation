const express = require("express");
const { uploadNote, getNotes, markAsViewed, deleteNote, downloadNote } = require("../controllers/note.controller.js");
const protect = require("../middlewares/auth.middleware.js");
const { protectWithQueryToken } = require("../middlewares/auth.middleware.js");
const upload = require("../middlewares/upload.middleware.js");

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadNote);
router.get("/", protect, getNotes);
router.put("/:id/view", protect, markAsViewed);
// Query-token variant: browser-native downloads open a new tab without headers
router.get("/download/:id", protectWithQueryToken, downloadNote);
router.delete("/:id", protect, deleteNote);

module.exports = router;
