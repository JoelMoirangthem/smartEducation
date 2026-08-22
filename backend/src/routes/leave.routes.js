const express = require("express");
const router = express.Router();
const { requestLeave, getLeaves, reviewLeave, cancelLeave } = require("../controllers/leave.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", requestLeave);
router.get("/", getLeaves);
router.put("/:id/review", reviewLeave);
router.put("/:id/cancel", cancelLeave);

module.exports = router;
