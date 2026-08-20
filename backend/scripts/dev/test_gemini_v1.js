const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

async function testDirectV1() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        console.log("Found Models (V1):");
        if (data.models) {
            data.models.forEach(m => {
                console.log(`- ${m.name}`);
            });
        } else {
            console.log("No models returned in V1 list.");
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

testDirectV1();
