const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));
// Sanitize NoSQL operator injection — Express 5 has read-only req.query, so sanitize body/params only
const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            sanitize(obj[key]);
        }
    }
};
app.use((req, res, next) => {
    sanitize(req.body);
    sanitize(req.params);
    // query sanitized via allow-listing in controllers; avoid mutating Express 5 getter
    next();
});

// Initialize local storage repository
const uploadDir = path.join(__dirname, '../uploads/notes');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(">>> [Repository] Initialized local storage: uploads/notes");
}

// Middleware — tightened body limits (face images go via multipart, not JSON)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// CORS: allow only configured origins (no wildcard + credentials)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, native apps, same-origin)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// NOTE: /uploads is intentionally NOT served statically — uploaded note files
// are access-controlled and delivered via GET /api/v1/notes/download/:id
// (see controllers/note.controller.js). Public static serving would bypass
// that entire ACL.

// Global Request Logger with Performance Tracking (sanitize ?token= to avoid leaking JWTs)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const safeUrl = req.originalUrl ? req.originalUrl.replace(/token=[^&]*/gi, 'token=***') : req.originalUrl;
        console.log(`[${new Date().toISOString()}] ${req.method} ${safeUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Routes
app.use('/api', require('./routes/index'));

// Production: serve frontend static if built (enables single-service free deploy on Render)
// When frontend/dist exists and NODE_ENV=production, Express serves the Vite build
// so VITE_API_URL can stay empty (/api/v1) and Socket.IO same-origin works.
// NOTE: Express 5 + path-to-regexp v8 rejects app.get('*') — use a middleware fallback instead.
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(__dirname, '../../frontend/dist');
    if (fs.existsSync(frontendDist)) {
        app.use(express.static(frontendDist));
        // SPA fallback — must be registered AFTER API routes; skips /api and /socket.io
        app.use((req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') return next();
            if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) return next();
            res.sendFile(path.join(frontendDist, 'index.html'));
        });
        console.log('>>> [Static] Serving frontend from', frontendDist);
    }
}

app.get('/', (req, res) => {
    res.send('Welcome to Attendance Management System');
});
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: "healthy",
        service: "EduSmart Backend",
        timestamp: new Date().toISOString()
    });
});

// Global error handler — consistent shape, no stack leak in production
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: "Payload too large" });
    }
    const status = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';
    const message = status >= 500 && isProd ? "Internal server error" : (err.message || "Internal server error");
    res.status(status).json({ message, ...(status < 500 ? {} : {}) });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});
module.exports = app;