const express = require("express");
const router = express.Router();
const { createFee, getFees, recordPayment, getPayments, getFeeStats, updateOverdueFees } = require("../controllers/fee.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", createFee);
router.get("/", getFees);
router.get("/stats", getFeeStats);
router.post("/pay", recordPayment);
router.get("/payments", getPayments);
router.put("/update-overdue", updateOverdueFees);

module.exports = router;
