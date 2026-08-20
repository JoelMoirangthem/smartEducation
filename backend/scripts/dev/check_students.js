const mongoose = require("mongoose");
const User = require("./src/models/user.model");
require("dotenv").config();

const checkStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const students = await User.find({ role: "student" });
        console.log(`Found ${students.length} students.`);

        students.forEach(s => {
            console.log(`Student: ${s.name}, Role: ${s.role}, ClassID: ${s.classId || "MISSING"}`);
        });

        // Optional: Fix them if missing
        const missingClass = students.filter(s => !s.classId);
        if (missingClass.length > 0) {
            console.log(`Fixing ${missingClass.length} students...`);
            await User.updateMany({ role: "student" }, { $set: { classId: "Class-Xr" } });
            console.log("All students updated to Class-Xr");
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkStudents();
