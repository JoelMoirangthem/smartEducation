/**
 * Internal relay: lets the Python agent service push socket.io events to rooms.
 * Transport plumbing ONLY — no agent logic lives here. Guarded by a shared secret.
 */
const express = require("express");

const router = express.Router();

router.post("/emit", (req, res) => {
    const key = req.get("x-agent-relay-key");
    const expected = process.env.AGENT_RELAY_SECRET;
    if (!expected || key !== expected) {
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
