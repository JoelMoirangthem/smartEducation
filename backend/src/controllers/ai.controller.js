const { OpenAI } = require("openai");
const Note = require("../models/note.model");
const Mark = require("../models/mark.model");
const User = require("../models/user.model");
const ChatSession = require("../models/chatSession.model");

// ================= AI PROVIDER CHAIN: AgentRouter (primary) → Sarvam → NVIDIA (fallback) — unified agentic API =================
if (!process.env.AGENTROUTER_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.SARVAM_API_KEY) {
    console.warn("⚠️  No AI API keys set (AGENTROUTER_API_KEY / NVIDIA_API_KEY / SARVAM_API_KEY) — AI tutor features will be disabled.");
}
const agentRouterClient = new OpenAI({
    baseURL: process.env.AGENTROUTER_BASE_URL || "https://agentrouter.org/v1",
    apiKey: process.env.AGENTROUTER_API_KEY || "",
    defaultHeaders: { "User-Agent": process.env.AGENTROUTER_USER_AGENT || "opencode/1.0.0" }
});
const nvidiaClient = new OpenAI({
    baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY || ""
});
const sarvamClient = new OpenAI({
    baseURL: process.env.SARVAM_BASE_URL || "https://api.sarvam.ai/v1",
    apiKey: process.env.SARVAM_API_KEY || ""
});

const AGENTROUTER_MODEL = process.env.AGENTROUTER_MODEL || "gpt-5.6-sol";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "openai/gpt-oss-120b";
const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || "sarvam-105b-conversations";

// Provider chain: AgentRouter (agentic, primary) → Sarvam (fast) → NVIDIA (reasoning fallback)
const PROVIDERS = [
    { name: "AgentRouter", client: agentRouterClient, model: AGENTROUTER_MODEL, enabled: !!process.env.AGENTROUTER_API_KEY, maxTokens: 8192 },
    { name: "Sarvam", client: sarvamClient, model: ASSISTANT_MODEL, enabled: !!process.env.SARVAM_API_KEY, maxTokens: 4096 },
    { name: "NVIDIA", client: nvidiaClient, model: NVIDIA_MODEL, enabled: !!process.env.NVIDIA_API_KEY, maxTokens: 8192 }
];
const SYS_PROMPT = "You are EduSmart AI, a helpful, concise, and professional academic assistant for students and teachers in an education platform.";

// ================= UNIFIED NON-STREAMING LLM CALL (AgentRouter → Sarvam → NVIDIA) =================
const unifiedLLMCall = async ({ prompt, isJson = false }) => {
    const messages = [
        {
            role: "system",
            content: SYS_PROMPT + (isJson ? "\nImportant: Respond strictly in valid JSON with no markdown code blocks or conversational prefixes." : "")
        },
        { role: "user", content: prompt }
    ];

    let lastError;
    for (const provider of PROVIDERS) {
        if (!provider.enabled) continue;
        try {
            const completion = await provider.client.chat.completions.create({
                model: provider.model,
                messages,
                temperature: 0.6,
                top_p: 0.7,
                max_tokens: provider.maxTokens || 4096,
                stream: false
            });

            const content = completion.choices?.[0]?.message?.content || "";
            if (!content) throw new Error("Empty response from AI model");
            return content;
        } catch (err) {
            console.warn(`>>> [AI ENGINE] ${provider.name} call failed (${err.message}), trying next provider...`);
            lastError = err;
        }
    }
    console.error(">>> [AI ENGINE] All providers failed:", lastError?.message);
    throw lastError || new Error("No AI providers available");
};

/**
 * Robust JSON cleanup and parsing
 */
const safeParseJson = (text) => {
    if (!text) return null;
    try {
        const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error on text:", text.substring(0, 100));
        const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrMatch) {
            try { return JSON.parse(arrMatch[0]); } catch (e2) {}
        }
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e3) {}
        }
        return null;
    }
};

// Access check for using a note's content in AI features (mirrors the
// downloadNote ACL: admin / uploader / same-class student / assigned teacher)
const canUseNoteForAI = async (user, note) => {
    if (!note) return false;
    if (user.role === "admin") return true;
    if (String(note.uploadedBy) === String(user.id)) return true;
    if (user.role === "student") {
        return !!(user.classId && note.classId && String(note.classId) === String(user.classId));
    }
    if (user.role === "teacher") {
        const teacher = await User.findById(user.id).select("managedClassIds classId assignedSubjectIds").lean();
        if (!teacher) return false;
        const classIds = [
            ...(teacher.managedClassIds || []).map(String),
            ...(teacher.classId ? [String(teacher.classId)] : [])
        ];
        if (note.classId && classIds.includes(String(note.classId))) return true;
        return (teacher.assignedSubjectIds || []).some(s => String(s) === String(note.subjectId));
    }
    return false;
};

// ================= AI TUTOR: EXPLAIN CONTENT =================
const explainContent = async (req, res) => {
    try {
        const { text, noteId } = req.body;
        let contentToExplain = text;

        if (noteId) {
            const note = await Note.findById(noteId);
            if (!(await canUseNoteForAI(req.user, note))) {
                return res.status(403).json({ message: "You do not have access to this note" });
            }
            if (note && note.content) contentToExplain = note.content;
        }

        if (!contentToExplain) return res.status(400).json({ message: "No content provided" });

        const prompt = `Act as an expert tutor. Explain the following concept in simple, easy-to-understand terms for a student. Use analogies if possible. \n\nContent: ${contentToExplain}`;

        const explanation = await unifiedLLMCall({ prompt });

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
            if (!(await canUseNoteForAI(req.user, note))) {
                return res.status(403).json({ message: "You do not have access to this note" });
            }
            if (note && note.content) contentToQuiz = note.content;
        }

        if (!contentToQuiz) return res.status(400).json({ message: "No content provided" });

        const prompt = `Generate a JSON array of 5 multiple-choice questions based on the following content. Each object in the array should have 'question', 'options' (array of 4 strings), and 'correctAnswer' (string, matching one option). Just return the raw JSON array. \n\nContent: ${contentToQuiz}`;

        const quizText = await unifiedLLMCall({ prompt, isJson: true });

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

    const sorted = [...graphData].sort((a, b) => b.score - a.score);
    const top = sorted[0] || { subject: "General", score: 0 };
    const bottom = sorted[sorted.length - 1] || { subject: "General", score: 0 };

    const highlights = [];
    if (top.score >= 80) highlights.push(`🌟 Excelled in ${top.subject}`);
    if (bottom.score < 50) highlights.push(`⚠️ Focus needed on ${bottom.subject}`);
    highlights.push(`📊 Consistent efforts in ${graphData.length} subjects`);
    if (graphData.every(s => s.score > 60)) highlights.push(`✅ Solid performance across all subjects`);

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

    if (graphData.length === 0) {
        return {
            summary: "No mark data available yet.",
            analysis: "Not enough data to analyze performance.",
            graphData: [],
            trendData: [],
            highlights: [],
            isFallback: true
        };
    }

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

        // Authorization: teachers may only analyze students they teach
        // (student's class in their managed classes, or the requested subject
        // belongs to the student's class and the teacher teaches it)
        if (!["student", "admin"].includes(req.user.role)) {
            const [student, teacher] = await Promise.all([
                User.findById(userId).select("classId role").lean(),
                User.findById(req.user.id).select("managedClassIds classId assignedSubjectIds").lean()
            ]);
            if (!student || student.role !== "student") {
                return res.status(404).json({ message: "Student not found" });
            }
            const classIds = new Set([
                ...((teacher?.managedClassIds || []).map(String)),
                ...(teacher?.classId ? [String(teacher.classId)] : [])
            ]);
            let authorized = !!(student.classId && classIds.has(String(student.classId)));
            if (!authorized && subjectId && student.classId) {
                const Subject = require("../models/subject.model");
                authorized = !!(await Subject.findOne({
                    _id: subjectId, classId: student.classId, teachers: req.user.id
                }));
            }
            if (!authorized) {
                return res.status(403).json({
                    message: "You are not authorized to view this student's performance"
                });
            }
        }

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

        studentName = marks[0].studentId?.name || "Student";
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
            const analysisText = await unifiedLLMCall({ prompt, isJson: true });

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
        res.status(500).json({ message: "AI Engine is temporarily unavailable.", error: error.message });
    }
};

// ================= AI CHAT ASSISTANT (TUTOR STREAMING) =================
// Moved to the Python agent service (/api/v1/ai/chat — agent-py/tutor.py).
// Node keeps explain/quiz/analyze and session CRUD only.

const getChatSessions = async (req, res) => {
    try {
        const { mode } = req.query;
        const query = { user: req.user.id };
        if (mode) query.mode = mode;
        const sessions = await ChatSession.find(query).select("title updatedAt mode").sort({ updatedAt: -1 });
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
    getChatSessions,
    getChatSessionById,
    deleteChatSession
};