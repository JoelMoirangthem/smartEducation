require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testChatRateLimit() {
    try {
        console.log("Testing CHAT with gemini-flash-latest...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        console.log("Starting chat...");
        const chat = model.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 100,
            },
        });

        console.log("Sending message 1...");
        const result1 = await chat.sendMessage("Hello, can you help me?");
        console.log("Response 1:", result1.response.text());

        console.log("Waiting 2 seconds...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("Sending message 2 (follow-up)...");
        const result2 = await chat.sendMessage("What did I just ask?");
        console.log("Response 2:", result2.response.text());

    } catch (error) {
        console.error("Chat Test Failed:", error.message);
        if (error.status === 429) {
            console.error("CONFIRMED: Rate Limit Exceeded (429) on Chat");
        }
    }
}

testChatRateLimit();
