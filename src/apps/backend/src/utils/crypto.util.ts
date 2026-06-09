import jwt from 'jsonwebtoken';

// Note: JWT_PRIVATE_KEY should be passed as a base64 encoded string to avoid newline issues in .env
const privB64 = process.env.JWT_PRIVATE_KEY || '';
const PRIVATE_KEY = privB64 ? Buffer.from(privB64, 'base64').toString('utf8') : '';

const pubB64 = process.env.JWT_PUBLIC_KEY || '';
const PUBLIC_KEY = pubB64 ? Buffer.from(pubB64, 'base64').toString('utf8') : '';

export function encryptAES(payload: object): string {
    // Actually now generating JWT, but keeping the name for compatibility if used elsewhere, 
    // though better to rename to signJWT.
    if (!PRIVATE_KEY) throw new Error("Missing JWT_PRIVATE_KEY in environment variables.");
    return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
}

export function decryptAES(ciphertext: string): any {
    if (!PUBLIC_KEY) throw new Error("Missing JWT_PUBLIC_KEY in environment variables.");
    try {
        return jwt.verify(ciphertext, PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch (error) {
        return null;
    }
}
