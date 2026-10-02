import mongoose from 'mongoose';

/** One counter per user, action and time window; MongoDB deletes it when the window ends. */
const RateLimitSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);
