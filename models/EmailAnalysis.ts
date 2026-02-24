import mongoose from 'mongoose';

const EmailAnalysisSchema = new mongoose.Schema({
    emailId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userEmail: {
        type: String,
        required: true,
        index: true,
    },
    category: String,
    summary: String,
    requires_reply: Boolean,
    draft_reply: String,
    appliedLabels: [String]
}, { timestamps: true });

export default mongoose.models.EmailAnalysis || mongoose.model('EmailAnalysis', EmailAnalysisSchema);
