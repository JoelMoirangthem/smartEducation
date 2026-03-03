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
app.use(cors({
    origin: '*', // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static files (for local note storage fallback)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
        message: "you are perfectly work"
    })
})
module.exports = app;
