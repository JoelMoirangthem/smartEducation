const mongoose = require('mongoose');
const path = require('path');

// Require models with absolute paths
const User = require(path.join(__dirname, 'src', 'models', 'user.model.js'));
const Subject = require(path.join(__dirname, 'src', 'models', 'subject.model.js'));
const Class = require(path.join(__dirname, 'src', 'models', 'class.model.js'));

async function diag() {
    try {
        await mongoose.connect('mongodb://localhost:27017/attendance_db');
        console.log('--- DIAGNOSTICS ---');

        const teacher = await User.findOne({ role: 'teacher' });
        if (!teacher) {
            console.log('No teacher found in database.');
            process.exit(0);
        }

        console.log('Teacher Name:', teacher.name);
        console.log('Teacher ID:', teacher._id);
        console.log('Teacher Profile classId:', teacher.classId);

        const managedClasses = await Class.find({ classTeacher: teacher._id });
        console.log('Classes where primary Class Teacher:', managedClasses.map(c => `${c.name} (${c._id})`));

        const classIds = new Set();
        if (teacher.classId) classIds.add(teacher.classId.toString());
        managedClasses.forEach(c => classIds.add(c._id.toString()));

        console.log('Combined Class IDs to check:', Array.from(classIds));

        const subjects = await Subject.find({
            $or: [
                { teachers: teacher._id },
                { classId: { $in: Array.from(classIds) } }
            ]
        }).populate('classId', 'name');

        console.log('Subjects Found:', subjects.length);
        subjects.forEach(s => {
            console.log(`- ${s.name} (Class: ${s.classId?.name || 'Unlinked'})`);
        });

        console.log('--- END DIAGNOSTICS ---');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

diag();
