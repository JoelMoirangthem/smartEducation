const mongoose = require('mongoose');

const connectDB = async (retries = 5, delayMs = 3000) => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db';
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
            if (attempt >= retries) {
                console.error("❌ FATAL: Could not connect to MongoDB after all attempts.");
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
};

module.exports = connectDB;