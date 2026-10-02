import crypto from 'crypto';
import { getEnv } from './env';

/**
 * Encryption for users' AI API keys at rest.
 *
 * New values use AES-256-GCM, which also detects tampering:
 *   "v2:<iv>:<auth tag>:<ciphertext>" (base64url parts)
 * Values saved before that used AES-256-CBC ("<iv hex>:<data hex>"). They
 * still decrypt, and needsReencryption() tells callers to upgrade them.
 */

const GCM_PREFIX = 'v2:';
const GCM_IV_BYTES = 12;
const CBC_IV_BYTES = 16;

function getEncryptionKey(): Buffer {
    const key = Buffer.from(getEnv('ENCRYPTION_KEY'));
    if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (32 ASCII characters).');
    }
    return key;
}

export function encryptApiKey(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return GCM_PREFIX + [iv, tag, encrypted].map((b) => b.toString('base64url')).join(':');
}

export function decryptApiKey(stored: string): string {
    if (!stored) return '';
    try {
        if (stored.startsWith(GCM_PREFIX)) {
            const [iv, tag, data] = stored.slice(GCM_PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64url'));
            if (!iv || !tag || !data || iv.length !== GCM_IV_BYTES) throw new Error('Malformed value');
            const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        }
        // Keys saved before encryption existed were stored as plain text
        if (!stored.includes(':')) return stored;

        const [ivHex, ...rest] = stored.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        if (iv.length !== CBC_IV_BYTES) throw new Error('Malformed value');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
        return Buffer.concat([decipher.update(Buffer.from(rest.join(':'), 'hex')), decipher.final()]).toString('utf8');
    } catch (error) {
        console.error('Decryption failed:', error instanceof Error ? error.message : error);
        throw new Error('Failed to decrypt API key. Please check your encryption settings.');
    }
}

/** True for values in an older format (plain text or AES-CBC) that should be re-saved. */
export function needsReencryption(stored: string | undefined): boolean {
    return Boolean(stored) && !stored!.startsWith(GCM_PREFIX);
}
