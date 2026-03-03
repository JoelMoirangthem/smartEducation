const mongoose = require("mongoose");
const User = require("./src/models/user.model");
require("dotenv").config();

const fixTeacher = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const teacher = await User.findOne({ role: "teacher" });
        if (teacher) {
            teacher.classId = "Class-Xr";
            await teacher.save();
            console.log(`Updated teacher ${teacher.name} with classId: Class-Xr`);
        } else {
            console.log("No teacher found");
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixTeacher();
