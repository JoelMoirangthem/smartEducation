const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Note = require("./src/models/note.model");
require("dotenv").config();

const fixData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // 1. Update Teacher to '2sem'
        const teacher = await User.findOne({ role: "teacher" });
        if (teacher) {
            teacher.classId = "2sem";
            await teacher.save();
            console.log(`Updated Teacher ${teacher.name} to class: 2sem`);
        }

        // 2. Update all Notes to '2sem'
        const updateResult = await Note.updateMany({}, { $set: { classId: "2sem" } });
        console.log(`Updated ${updateResult.modifiedCount} notes to class: 2sem`);

        // 3. Ensure Student is '2sem' (just in case)
        const studentResult = await User.updateMany({ role: "student" }, { $set: { classId: "2sem" } });
        console.log(`Ensured ${studentResult.matchedCount} students are in class: 2sem`);

        console.log("Data Alignment Complete!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixData();
