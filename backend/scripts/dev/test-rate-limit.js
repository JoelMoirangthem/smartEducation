require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testRateLimit() {
    try {
        console.log("Testing gemini-1.5-flash...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Sending request...");
        const result = await model.generateContent("Hello.");
        const response = await result.response;
        console.log("Success! Response:", response.text());

    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.status === 429) {
            console.error("CONFIRMED: Rate Limit Exceeded (429)");
        }
    }
}

testRateLimit();
