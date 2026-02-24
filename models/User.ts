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
        date: String,
        isUrgent: Boolean,
        isPastDue: Boolean,
        status: {
            type: String,
            default: "active",
            enum: ["active", "done"]
        }
    }]
}, { timestamps: true });

// Prevent Mongoose from recompiling the model if it already exists
export default mongoose.models.User || mongoose.model('User', UserSchema);
