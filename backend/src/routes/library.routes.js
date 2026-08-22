const express = require("express");
const router = express.Router();
const { addBook, searchBooks, issueBook, returnBook, getMyIssues, getOverdueBooks, updateBook, deleteBook } = require("../controllers/library.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/books", addBook);
router.get("/books", searchBooks);
router.put("/books/:id", updateBook);
router.delete("/books/:id", deleteBook);
router.post("/issue", issueBook);
router.put("/return/:id", returnBook);
router.get("/my-issues", getMyIssues);
router.get("/overdue", getOverdueBooks);

module.exports = router;
