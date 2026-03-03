const express = require("express");
const { explainContent, generateQuiz, analyzePerformance, chatWithAI, getChatSessions, getChatSessionById, deleteChatSession } = require("../controllers/ai.controller");
const protect = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/explain", protect, explainContent);
router.post("/quiz", protect, generateQuiz);
router.post("/analyze", protect, analyzePerformance);
router.post("/chat", protect, chatWithAI);

// History management
router.get("/sessions", protect, getChatSessions);
router.get("/sessions/:id", protect, getChatSessionById);
router.delete("/sessions/:id", protect, deleteChatSession);

module.exports = router;
