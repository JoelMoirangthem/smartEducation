/**
 * Internal relay: lets the Python agent service push socket.io events to rooms.
 * Transport plumbing ONLY — no agent logic lives here. Guarded by a shared secret.
 */
const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Strict rate limit: internal relay is low-volume, burst signals compromise probing
const relayLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many relay requests" }
});

function constantTimeEqual(a, b) {
    const bufA = Buffer.from(String(a || ""));
    const bufB = Buffer.from(String(b || ""));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

router.post("/emit", relayLimiter, (req, res) => {
    const key = req.get("x-agent-relay-key");
    const expected = process.env.AGENT_RELAY_SECRET;
    if (!expected || !key || !constantTimeEqual(key, expected)) {
        return res.status(401).json({ message: "Invalid relay key" });
    }

    const { event, payload, room, broadcast } = req.body || {};
    if (!event) return res.status(400).json({ message: "event is required" });

    const io = req.app.get("io");
    if (!io) return res.status(503).json({ message: "Socket server not ready" });

    try {
        if (broadcast) io.emit(event, payload);
        else if (room) io.to(String(room)).emit(event, payload);
        else return res.status(400).json({ message: "room or broadcast is required" });
        return res.json({ ok: true });
    } catch (err) {
        console.error("[internal/emit] error:", err.message);
        return res.status(500).json({ message: "Emit failed" });
    }
});

module.exports = router;
