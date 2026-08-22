const express = require("express");
const { explainContent, generateQuiz, analyzePerformance, getChatSessions, getChatSessionById, deleteChatSession } = require("../controllers/ai.controller");
const protect = require("../middlewares/auth.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.post("/explain", protect, aiLimiter, explainContent);
router.post("/quiz", protect, aiLimiter, generateQuiz);
router.post("/analyze", protect, analyzePerformance);

// History management
router.get("/sessions", protect, getChatSessions);
router.get("/sessions/:id", protect, getChatSessionById);
router.delete("/sessions/:id", protect, deleteChatSession);

module.exports = router;
