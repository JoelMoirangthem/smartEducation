const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const Note = require("../models/note.model");
const Mark = require("../models/mark.model");
const User = require("../models/user.model");
const ChatSession = require("../models/chatSession.model");

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-lite-preview-02-05" // Latest preview
];

// Simplified Model Getter
const getSpecificModel = (name) => {
    return genAI.getGenerativeModel({ model: name });
};

// ================= UNIFIED AI ENGINE =================
const unifiedGeminiCall = async (operation, options = {}) => {
    const { isJson = false, prompt = "" } = options;
    let lastError = "";

    // 1. Try Gemini Models
    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`>>> [AI ENGINE] Trying Gemini: ${modelName}`);
            const model = getSpecificModel(modelName);
            const result = await operation(model);
            if (result) return result;
        } catch (err) {
            const errMsg = err.message || "Unknown error";
            console.warn(`>>> [AI ENGINE] Gemini ${modelName} failed:`, errMsg);
            lastError = errMsg;

            // If it's a quota issue (429), it's likely similar across all models for this key, 
            // but we'll try others just in case one has a separate quota.
            continue;
        }
    }

    // 2. Try OpenAI Fallback (if configured)
    if (openai && prompt) {
        try {
            console.log(">>> [AI ENGINE] Trying OpenAI Fallback (GPT-4o-mini)");
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: isJson ? { type: "json_object" } : undefined
            });
            return completion.choices[0].message.content;
        } catch (oaError) {
            console.error(">>> [AI ENGINE] OpenAI Fallback also failed:", oaError.message);
        }
    }

    throw new Error(`AI Engine exhausted all models. Last Error: ${lastError}`);
};

/**
 * Robust JSON cleanup and parsing
 */
const safeParseJson = (text) => {
    if (!text) return null;
    try {
        const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error on text:", text.substring(0, 100));
        // Fallback for analysis - try to extract object from text if possible
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e2) { return null; }
        }
        return null;
    }
};

// ================= AI TUTOR: EXPLAIN CONTENT =================
const explainContent = async (req, res) => {
    try {
        const { text, noteId } = req.body;
        let contentToExplain = text;

        if (noteId) {
            const note = await Note.findById(noteId);
            if (note && note.content) contentToExplain = note.content;
        }

        if (!contentToExplain) return res.status(400).json({ message: "No content provided" });

        const prompt = `Act as an expert tutor. Explain the following concept in simple, easy-to-understand terms for a student. Use analogies if possible. \n\nContent: ${contentToExplain}`;

        const explanation = await unifiedGeminiCall(async (model) => {
            const result = await model.generateContent(prompt);
            return result.response.text();
        }, { prompt });

        res.json({ explanation });
    } catch (error) {
        console.error("AI Explain Error:", error);
        res.status(500).json({ message: "AI Engine is temporarily unavailable.", error: error.message });
    }
};

// ================= AI TUTOR: GENERATE QUIZ =================
const generateQuiz = async (req, res) => {
    try {
        const { text, noteId } = req.body;
        let contentToQuiz = text;

        if (noteId) {
            const note = await Note.findById(noteId);
            if (note && note.content) contentToQuiz = note.content;
        }

        if (!contentToQuiz) return res.status(400).json({ message: "No content provided" });

        const prompt = `Generate a JSON array of 5 multiple-choice questions based on the following content. Each object in the array should have 'question', 'options' (array of 4 strings), and 'correctAnswer' (string, matching one option). Just return the raw JSON array. \n\nContent: ${contentToQuiz}`;

        const quizText = await unifiedGeminiCall(async (model) => {
            const result = await model.generateContent(prompt);
            return result.response.text();
        }, { prompt, isJson: true });

        const quiz = safeParseJson(quizText);
        if (!quiz) throw new Error("Failed to parse quiz JSON");

        res.json({ quiz });
    } catch (error) {
        console.error("AI Quiz Error:", error);
        res.status(500).json({ message: "AI Engine is temporarily unavailable.", error: error.message });
    }
};

// ================= RULE-BASED FALLBACK: ANALYZE PERFORMANCE =================
const ruleBasedAnalysis = (marks, studentName) => {
    // Calculate subject stats
    const stats = {};
    marks.forEach(m => {
        const subName = m.subjectId?.name || "Unknown";
        if (!stats[subName]) stats[subName] = { total: 0, count: 0, max: 0 };
        const percent = (m.marksObtained / m.maxMarks) * 100;
        stats[subName].total += percent;
        stats[subName].count += 1;
    });

    const graphData = Object.keys(stats).map(sub => ({
        subject: sub,
        score: Math.round(stats[sub].total / stats[sub].count)
    }));

    // Sort to find strengths/weaknesses
    const sorted = [...graphData].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    const highlights = [];
    if (top.score >= 80) highlights.push(`🌟 Excelled in ${top.subject}`);
    if (bottom.score < 50) highlights.push(`⚠️ Focus needed on ${bottom.subject}`);
    highlights.push(`📊 Consistent efforts in ${graphData.length} subjects`);
    if (graphData.every(s => s.score > 60)) highlights.push(`✅ Solid performance across all subjects`);

    // Calculate trend data (avg by date)
    const trendMap = {};
    marks.forEach(m => {
        const date = new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!trendMap[date]) trendMap[date] = { total: 0, count: 0 };
        trendMap[date].total += (m.marksObtained / m.maxMarks) * 100;
        trendMap[date].count += 1;
    });

    const trendData = Object.keys(trendMap).map(date => ({
        date,
        score: Math.round(trendMap[date].total / trendMap[date].count)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    let analysis = `### 📊 Statistical Performance Analysis for ${studentName}\n\n`;
    analysis += `Based on your recent marks, you've shown strong performance in **${top.subject}** with an average of ${top.score}%. \n\n`;

    if (bottom.score < 60) {
        analysis += `However, **${bottom.subject}** appears to be a challenging area where you scored ${bottom.score}%. We recommend focused revision and perhaps peer study sessions for this subject.\n\n`;
    } else {
        analysis += `Overall, you are maintaining a healthy academic record with no critical areas of concern right now.\n\n`;
    }

    analysis += `#### Recommendation:\n- Continue the good work in ${top.subject}.\n- Allocate 20% more time to subjects with scores below 75%.`;

    return {
        summary: `You're currently excelling in ${top.subject}. Keep up the steady progress!`,
        analysis,
        graphData,
        trendData,
        highlights,
        isFallback: true
    };
};

// ================= AI COACH: ANALYZE PERFORMANCE =================
const analyzePerformance = async (req, res) => {
    let studentName = "Student";
    let marks = [];
    try {
        const userId = req.user.role === "student" ? req.user.id : req.body.studentId;
        const { subjectId } = req.body;

        if (!userId) return res.status(400).json({ message: "Student ID required" });

        let query = { studentId: userId };
        if (subjectId) query.subjectId = subjectId;

        marks = await Mark.find(query)
            .populate("studentId", "name")
            .populate("subjectId", "name code");

        if (marks.length === 0) {
            return res.json({
                analysis: "Not enough data to analyze performance yet.",
                summary: "Insufficient data.",
                graphData: [],
                highlights: []
            });
        }

        studentName = marks[0].studentId.name;
        const marksSummary = marks.map(m => {
            const subject = m.subjectId?.name || "Unknown Subject";
            return `${subject} (${m.examType}): ${m.marksObtained}/${m.maxMarks}`;
        }).join("\n");

        const prompt = `Act as an academic performance coach. Analyze the following marks for student ${studentName}.
        
Return a JSON object containing:
1. "summary": A short, encouraging 2-sentence summary.
2. "analysis": A detailed markdown analysis identifying strong and weak subjects with actionable advice.
3. "graphData": An array of { "subject": string, "score": number (0-100) } representing the percentage in each subject.
4. "trendData": An array of { "date": string (format: 'Month Day'), "score": number (0-100) } representing the overall performance trend over time based on the evaluation date.
5. "highlights": An array of 3-4 short strings representing key performance highlights or "needs improvement" flags.

Marks:
${marksSummary}`;

        try {
            const analysisText = await unifiedGeminiCall(async (model) => {
                const result = await model.generateContent(prompt);
                return result.response.text();
            }, { prompt, isJson: true });

            const analysisData = safeParseJson(analysisText);
            if (!analysisData) throw new Error("Failed to parse analysis JSON");

            return res.json(analysisData);
        } catch (aiErr) {
            console.warn("AI Engine failed, using rule-based analysis:", aiErr.message);
            const fallback = ruleBasedAnalysis(marks, studentName);
            return res.json(fallback);
        }
    } catch (error) {
        console.error("AI Analyze Error:", error);
        // Even if DB fails or something else, try to send a friendly message
        res.status(500).json({ message: "AI Engine is temporarily unavailable.", error: error.message });
    }
};

// ================= AI CHAT ASSISTANT =================
const chatWithAI = async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) return res.status(400).json({ message: "Message is required" });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        let accumulated = "";

        try {
            await unifiedGeminiCall(async (model) => {
                let chatHistory = (history || []).map(msg => ({
                    role: msg.role === 'client' ? 'user' : (msg.role === 'model' ? 'model' : 'user'),
                    parts: [{ text: msg.parts[0].text }]
                }));

                const sysMessages = [
                    { role: "user", parts: [{ text: "You are EduSmart AI. Be helpful, concise, and professional." }] },
                    { role: "model", parts: [{ text: "Understood. I am EduSmart AI, ready to assist." }] }
                ];

                const chat = model.startChat({
                    history: [...sysMessages, ...chatHistory].filter((v, i, a) => !(i > 0 && v.role === 'model' && a[i - 1].role === 'model')),
                    generationConfig: { maxOutputTokens: 2000 },
                });

                const result = await chat.sendMessageStream(message);
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    accumulated += chunkText;
                    res.write(chunkText);
                }
                return true;
            }, { prompt: message });
        } catch (allAiError) {
            console.warn("AI Engine Exhausted:", allAiError.message);
            const demoResponse = `### 🚀 EduSmart AI (Maintenance Mode)\n\nIt looks like our AI services are currently heavily loaded or quotas have been reached. \n\n**To continue your studies:**\n- Please try again in a short while.\n- You can still access your attendance, marks, and notes.\n\n*Thank you for your patience, student!*`;
            accumulated = demoResponse;
            const words = demoResponse.split(" ");
            for (const word of words) {
                res.write(word + " ");
                await new Promise(r => setTimeout(r, 20));
            }
        }

        // Save session logic...
        if (accumulated.trim()) {
            const { sessionId } = req.body;
            try {
                if (sessionId) {
                    await ChatSession.findByIdAndUpdate(sessionId, {
                        $push: { messages: { $each: [{ role: "user", content: message }, { role: "model", content: accumulated }] } }
                    });
                } else {
                    const title = message.length > 40 ? message.substring(0, 37) + "..." : message;
                    const newSession = new ChatSession({
                        user: req.user.id,
                        title,
                        messages: [{ role: "user", content: message }, { role: "model", content: accumulated }]
                    });
                    const saved = await newSession.save();
                    res.write(`\n\n[SESSION_ID:${saved._id}]`);
                }
            } catch (dbErr) { console.error("Session Save Error:", dbErr); }
        }
        res.end();
    } catch (error) {
        console.error("Critical AI Error:", error);
        if (!res.headersSent) res.status(500).json({ message: "AI Error", error: error.message });
        else res.end();
    }
};

const getChatSessions = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ user: req.user.id }).select("title updatedAt").sort({ updatedAt: -1 });
        res.json(sessions);
    } catch (error) { res.status(500).json({ message: "Failed to fetch sessions" }); }
};

const getChatSessionById = async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.id, user: req.user.id });
        if (!session) return res.status(404).json({ message: "Session not found" });
        res.json(session);
    } catch (error) { res.status(500).json({ message: "Failed to fetch session" }); }
};

const deleteChatSession = async (req, res) => {
    try {
        await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        res.json({ message: "Session deleted" });
    } catch (error) { res.status(500).json({ message: "Failed to delete session" }); }
};

module.exports = {
    explainContent,
    generateQuiz,
    analyzePerformance,
    chatWithAI,
    getChatSessions,
    getChatSessionById,
    deleteChatSession
};
