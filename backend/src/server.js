require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require("socket.io");
const { createDispatcher } = require('./events/dispatcher');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now, can be restricted later
        methods: ["GET", "POST"]
    }
});

// Initialize event dispatcher with io
const dispatcher = createDispatcher(io);

// Make io accessible to our router
app.set("io", io);

io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    // Enhanced authentication for rooms
    socket.on("authenticate", async (data) => {
        try {
            const { userId, role: clientRole } = data;
            if (!userId) return;

            // Failsafe: lookup real user data in DB to avoid stale data from client
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

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
        console.log("🔌 Client disconnected", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
