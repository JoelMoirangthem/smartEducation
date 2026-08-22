const mongoose = require("mongoose");

const agentActionLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    tool: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ["read", "write", "destructive"],
        required: true
    },
    args: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ["ok", "denied", "error", "rejected"],
        required: true
    },
    summary: {
        type: String,
        default: ""
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatSession",
        default: null
    },
    approvalId: {
        type: String,
        default: null
    },
    ip: {
        type: String,
        default: ""
    }
}, { timestamps: true });

agentActionLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AgentActionLog", agentActionLogSchema);