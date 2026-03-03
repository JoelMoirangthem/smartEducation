const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function reproduce() {
    try {
        const secret = process.env.JWT_SECRET || "joel";
        // Create a dummy token
        const token = jwt.sign({ id: "507f1f77bcf86cd799439011", role: "student" }, secret, { expiresIn: "1h" });

        console.log("Testing GET /api/v1/notifications...");
        const res = await axios.get("http://localhost:5000/api/v1/notifications", {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success! Status:", res.status);
        console.log("Data:", res.data);

    } catch (error) {
        console.log("Request Failed!");
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", error.response.data);
        } else {
            console.log("Error:", error.message);
        }
    }
}

reproduce();
