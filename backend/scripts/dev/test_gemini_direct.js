const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

async function testDirect() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        console.log("Found Models:");
        data.models.forEach(m => {
            console.log(`- ${m.name}`);
        });
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

testDirect();
