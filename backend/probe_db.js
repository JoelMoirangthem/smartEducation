const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/user.model');

async function probe() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to:', mongoose.connection.name);
        const count = await User.countDocuments();
        console.log('User count:', count);
        const users = await User.find().limit(5);
        console.log('Sample users:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
probe();
