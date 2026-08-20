const mongoose = require("mongoose");
const User = require("./src/models/user.model");
require("dotenv").config();

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const users = await User.find({});
        console.log(`Found ${users.length} total users.`);

        users.forEach(u => {
            console.log(`User: ${u.name} | Role: ${u.role} | ClassID: ${u.classId || "MISSING"}`);
            // Fix student classId if missing
            if (u.role === 'student' && !u.classId) {
                u.classId = "Class-Xr";
                u.save();
                console.log(`--> Fixed classId for ${u.name}`);
            }
        });

        setTimeout(() => process.exit(), 2000); // Wait for saves
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listUsers();
