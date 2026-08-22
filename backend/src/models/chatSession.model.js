const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        default: "New Chat"
    },
    mode: {
        type: String,
        enum: ["tutor", "agent"],
        default: "tutor"
    },
    messages: [
        {
            role: {
                type: String,
                enum: ["user", "model"],
                required: true
            },
            content: {
                type: String,
                required: true
            },
            // Agent-mode activity trail (absent on tutor messages)
            meta: {
                intent: String,
                subagent: String,
                reasoning: String,
                steps: [
                    {
                        name: String,
                        label: String,
                        status: String,
                        duration: Number,
                        detail: String
                    }
                ]
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

// Auto-delete sessions older than 30 days to prevent unbounded growth
chatSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("ChatSession", chatSessionSchema);
