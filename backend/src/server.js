const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const { createDispatcher } = require('./events/dispatcher');

const PORT = process.env.PORT || 5000;

// Startup validation: fail fast when critical config is missing
if (!process.env.JWT_SECRET) {
    console.error("❌ FATAL: JWT_SECRET is not set. Add it to backend/.env (see .env.example).");
    process.exit(1);
}
if (!process.env.MONGODB_URI) {
    console.error("❌ FATAL: MONGODB_URI is not set. Add it to backend/.env (see .env.example).");
    process.exit(1);
}

// Connect to Database
connectDB();

const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.io authentication middleware: verify JWT on handshake
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
});

// Initialize event dispatcher with io
const dispatcher = createDispatcher(io);

// Make io accessible to our router
app.set("io", io);

io.on("connection", (socket) => {
    console.log("New client connected", socket.id, "user:", socket.user?.id);

    // Enhanced authentication for rooms (userId from verified JWT, not from client)
    socket.on("authenticate", async () => {
        try {
            const userId = socket.user?.id;
            if (!userId) return;

            // Failsafe: lookup real user data in DB to avoid stale data
            const User = require("./models/user.model");
            const user = await User.findById(userId)
                .select('role classId managedClassIds assignedSubjectIds')
                .populate({
                    path: 'assignedSubjectIds',
                    select: 'classId'
                })
                .lean();

            if (!user) {
                console.warn(`⚠️ Auth failed: User ${userId} not found`);
                return;
            }

            const role = user.role;
            const classId = user.classId ? user.classId.toString() : null;

            // Join personal room
            socket.join(`user:${userId}`);
            socket.join(`role:${role}`);

            // --- Room Joining Logic (High Performance Portfolio Mapping) ---
            if (role === 'student' && classId) {
                socket.join(`class:${classId}`);
                console.log(`🎓 Student ${userId} joined room: class:${classId}`);
            }
            else if (role === 'teacher' || role === 'admin') {
                const roomsToJoin = new Set();

                // 1. Join Student-style class if assigned (Legacy/Failsafe)
                if (classId) roomsToJoin.add(`class:${classId}`);

                // 2. Join Managed Classes (as Class Teacher)
                const managed = user.managedClassIds || [];
                managed.forEach(c => roomsToJoin.add(`class:${c.toString()}`));

                // 3. Join Classes for Assigned Subjects (as Subject Teacher)
                const subjects = user.assignedSubjectIds || [];
                subjects.forEach(s => {
                    if (s.classId) roomsToJoin.add(`class:${s.classId.toString()}`);
                });

                roomsToJoin.forEach(room => {
                    socket.join(room);
                    console.log(`📡 Staff ${userId} joined room: ${room}`);
                });
            }

            console.log(`✅ Socket ${socket.id} authenticated as ${role}`);
        } catch (authErr) {
            console.error("❌ Socket Auth Error:", authErr.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("🔌 Client disconnected", socket.id);
    });
});

server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Verify Python agent connectivity at startup (infra probe — unauthenticated)
    const AGENT_PY_URL = process.env.AGENT_PY_URL || 'http://127.0.0.1:8000';
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(`${AGENT_PY_URL}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (resp.ok) console.log(`✅ Python agent service reachable at ${AGENT_PY_URL}`);
        else console.warn(`⚠️  Python agent returned HTTP ${resp.status}`);
    } catch (e) {
        console.warn(`⚠️  Python agent not reachable at ${AGENT_PY_URL} — agent features will be unavailable: ${e.message}`);
    }
});