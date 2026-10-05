import mongoose from 'mongoose';
import { getEnv } from './env';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

const globalWithCache = global as typeof globalThis & { mongoose?: MongooseCache };
const cached: MongooseCache = globalWithCache.mongoose ?? (globalWithCache.mongoose = { conn: null, promise: null });

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const MONGODB_URI = getEnv('MONGODB_URI');
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('MongoDB connection failed:', e);
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
