import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    geminiApiKey: {
        type: String,
        default: "",
    },
    openAiApiKey: {
        type: String,
        default: "",
    },
    anthropicApiKey: {
        type: String,
        default: "",
    },
    // Which saved key AI features use by default
    aiProvider: {
        type: String,
        enum: ["gemini", "openai", "anthropic", ""],
        default: "",
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
    customLabels: [{
        name: String,
        prompt: String,
        color: String,
        applyRetroactively: Boolean
    }],
    globalTasks: [{
        id: String,
        emailId: String,
        title: String,
        // Exact due date (YYYY-MM-DD) when known; "date" keeps the email's wording
        dueDate: { type: String, default: "" },
        date: String,
        isUrgent: Boolean,
        status: {
            type: String,
            default: "active",
            enum: ["active", "done"]
        },
        createdAt: { type: String, default: "" },
        completedAt: { type: String, default: "" },
    }]
}, { timestamps: true });

// Prevent Mongoose from recompiling the model if it already exists
export default mongoose.models.User || mongoose.model('User', UserSchema);
