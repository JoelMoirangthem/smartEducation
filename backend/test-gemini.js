require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    try {
        console.log("Checking API Key...");
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing in .env");
        }
        console.log("API Key found (length):", process.env.GEMINI_API_KEY.length);

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("Generating content...");
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        const text = response.text();

        console.log("Success! Response:", text);
    } catch (error) {
        console.error("Gemini Test Failed:", error.message);
        if (error.response) {
            console.error("Response Error:", JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();
