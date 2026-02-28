import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a plain text string using AES-256-CBC.
 * Returns the IV and encrypted data as a colon-separated string (iv:encryptedContent).
 */
export function encryptApiKey(text: string): string {
    if (!text) return '';
    if (ENCRYPTION_KEY.length !== 32) {
        throw new Error('Encryption key must be 32 characters long.');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts an encrypted string (iv:encryptedContent) back to plain text.
 */
export function decryptApiKey(hash: string): string {
    if (!hash) return '';
    if (!hash.includes(':')) {
        // If it's not in the iv:data format, it might be an old unencrypted key.
        // We'll return it as is or handle it gracefully.
        return hash;
    }

    if (ENCRYPTION_KEY.length !== 32) {
        throw new Error('Encryption key must be 32 characters long.');
    }

    try {
        const textParts = hash.split(':');
        const iv = Buffer.from(textParts.shift() || '', 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt API key. Please check your encryption settings.');
    }
}
