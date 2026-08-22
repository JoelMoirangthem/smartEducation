const LibraryBook = require("../models/libraryBook.model");
const LibraryIssue = require("../models/libraryIssue.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

// Add book (admin/librarian only)
const addBook = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can add books" });
        }
        const book = await LibraryBook.create(req.body);
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Search books
const searchBooks = async (req, res) => {
    try {
        const { q, category, subjectId } = req.query;
        let query = {};
        if (q) query.$text = { $search: q };
        if (category) query.category = category;
        if (subjectId) query.subjectId = subjectId;

        const books = await LibraryBook.find(query)
            .populate("subjectId", "name code")
            .sort({ title: 1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Issue book
const issueBook = async (req, res) => {
    try {
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only staff can issue books" });
        }
        const { bookId, userId, dueDate } = req.body;
        if (!bookId || !userId || !dueDate) {
            return res.status(400).json({ message: "bookId, userId, and dueDate are required" });
        }
        const book = await LibraryBook.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });
        if (book.availableCopies <= 0) {
            return res.status(400).json({ message: "No copies available" });
        }

        // Check if user already has this book
        const existing = await LibraryIssue.findOne({ bookId, userId, status: { $in: ["issued", "overdue"] } });
        if (existing) {
            return res.status(400).json({ message: "User already has this book issued" });
        }

        const issue = await LibraryIssue.create({
            bookId, userId, dueDate, issuedBy: req.user.id
        });
        // Atomic decrement guarded on availability — no oversubscription race
        const updatedBook = await LibraryBook.findOneAndUpdate(
            { _id: bookId, availableCopies: { $gt: 0 } },
            { $inc: { availableCopies: -1 } },
            { new: true }
        );
        if (updatedBook) {
            await LibraryBook.updateOne(
                { _id: updatedBook._id },
                { status: updatedBook.availableCopies === 0 ? "out_of_stock" : "available" }
            );
        }

        await Notification.create({
            userId,
            message: `Book "${book.title}" issued. Due: ${new Date(dueDate).toLocaleDateString()}`,
            type: "info"
        });

        res.status(201).json(issue);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Return book (admin/teacher, or the student who borrowed it)
const returnBook = async (req, res) => {
    try {
        const issue = await LibraryIssue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue record not found" });
        if (!["admin", "teacher"].includes(req.user.role) && issue.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only return your own books" });
        }
        if (issue.status === "returned") return res.status(400).json({ message: "Already returned" });

        issue.returnDate = new Date();
        issue.status = "returned";

        // Calculate fine if overdue
        if (new Date() > new Date(issue.dueDate)) {
            const daysOverdue = Math.ceil((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
            issue.fine = daysOverdue * 5; // ₹5 per day
        }
        await issue.save();

        const book = await LibraryBook.findById(issue.bookId);
        if (book && book.totalCopies > 0) {
            // Atomic increment with ceiling guard at totalCopies
            const updated = await LibraryBook.findOneAndUpdate(
                { _id: book._id, $expr: { $lt: ["$availableCopies", "$totalCopies"] } },
                { $inc: { availableCopies: 1 } },
                { new: true }
            );
            if (updated) {
                await LibraryBook.updateOne(
                    { _id: updated._id },
                    { status: updated.availableCopies === 0 ? "out_of_stock" : "available" }
                );
            }
        }

        res.json(issue);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get user's issued books
const getMyIssues = async (req, res) => {
    try {
        const query = { userId: req.user.id, status: { $in: ["issued", "overdue"] } };
        const issues = await LibraryIssue.find(query)
            .populate("bookId", "title author isbn")
            .sort({ issueDate: -1 });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get overdue books
const getOverdueBooks = async (req, res) => {
    try {
        const issues = await LibraryIssue.find({ status: "issued", dueDate: { $lt: new Date() } })
            .populate("bookId", "title author")
            .populate("userId", "name email classId")
            .sort({ dueDate: 1 });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update book
const updateBook = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can update books" });
        }
        const book = await LibraryBook.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!book) return res.status(404).json({ message: "Book not found" });
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete book
const deleteBook = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can delete books" });
        }
        const activeIssues = await LibraryIssue.countDocuments({ bookId: req.params.id, status: "issued" });
        if (activeIssues > 0) {
            return res.status(400).json({ message: "Cannot delete book with active issues" });
        }
        await LibraryBook.findByIdAndDelete(req.params.id);
        res.json({ message: "Book deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { addBook, searchBooks, issueBook, returnBook, getMyIssues, getOverdueBooks, updateBook, deleteBook };
