const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Initialize local storage repository
const uploadDir = path.join(__dirname, '../uploads/notes');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(">>> [Repository] Initialized local storage: uploads/notes");
}

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Global Request Logger with Performance Tracking
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Routes
app.use('/api', require('./routes/index'));

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
module.exports = app;