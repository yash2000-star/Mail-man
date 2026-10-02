/**
 * Server-side environment variables. Each one is read on first use (not at
 * import time) so `next build` works without secrets, while a missing value
 * at runtime fails with a message that says exactly what to set.
 * See .env.example for what each variable is.
 */
type ServerEnvVar =
    | 'MONGODB_URI'
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
    | 'NEXTAUTH_SECRET'
    | 'ENCRYPTION_KEY';

export function getEnv(name: ServerEnvVar): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
    }
    return value;
}
