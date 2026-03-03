const express = require("express");
const { uploadNote, getNotes, markAsViewed, deleteNote, downloadNote } = require("../controllers/note.controller.js");
const protect = require("../middlewares/auth.middleware.js");
const upload = require("../middlewares/upload.middleware.js");

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadNote);
router.get("/", protect, getNotes);
router.put("/:id/view", protect, markAsViewed);
router.get("/download/:id", protect, downloadNote);
router.delete("/:id", protect, deleteNote);

module.exports = router;
