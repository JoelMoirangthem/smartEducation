const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many login attempts, please try again later." }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many registration attempts, please try again later." }
});

// Face registration is heavy (multiple images); strict limit to prevent abuse
const faceRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many face registration attempts, please try again later." }
});

// Face marking happens every ~500ms per client; allow generous but bounded rate
const faceMarkLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many recognition requests, slow down." }
});

const notificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "Too many notifications, please slow down." }
});

// Agent chat/approve limits live in the Python service now (slowapi).

// AI tutor endpoints bill third-party LLM APIs — strict per-user limit
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: "AI request limit reached, please wait a moment." }
});

module.exports = {
    loginLimiter,
    registerLimiter,
    faceRegisterLimiter,
    faceMarkLimiter,
    notificationLimiter,
    aiLimiter
};