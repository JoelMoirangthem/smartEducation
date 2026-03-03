require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        console.log("Fetching models from:", url);

        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("\nAvailable Models (filtering for '1.5'):");
            const models = data.models.filter(m => m.name.includes("1.5"));
            models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
            console.log("\nAvailable Models (filtering for 'flash'):");
            const flash = data.models.filter(m => m.name.includes("flash"));
            flash.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
