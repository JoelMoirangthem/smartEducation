const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const models = await genAI.listModels();
        console.log("Available Models:");
        models.models.forEach(m => {
            console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(", ")})`);
        });
    } catch (error) {
        console.error("Failed to list models:", error.message);
    }
}

async function testSimpleGen() {
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of modelsToTest) {
        try {
            console.log(`\nTesting ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`${modelName} Success:`, result.response.text());
        } catch (error) {
            console.error(`${modelName} Failed:`, error.message);
        }
    }
}

listModels().then(testSimpleGen);
