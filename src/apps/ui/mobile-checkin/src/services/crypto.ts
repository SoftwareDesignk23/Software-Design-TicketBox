import * as jose from 'jose';

const pubB64 = process.env.EXPO_PUBLIC_JWT_PUBLIC_KEY || '';

let cachedPublicKey: jose.KeyLike | null = null;

async function getPublicKey(): Promise<jose.KeyLike> {
    if (cachedPublicKey) return cachedPublicKey;
    if (!pubB64) throw new Error("Missing EXPO_PUBLIC_JWT_PUBLIC_KEY");
    
    const pem = atob(pubB64);
    cachedPublicKey = await jose.importSPKI(pem, 'RS256');
    return cachedPublicKey;
}

/**
 * Verify and decode a JWT-signed QR payload.
 * Returns the decoded payload on success, or null if verification fails.
 */
export async function decryptAES(token: string): Promise<any> {
    try {
        const publicKey = await getPublicKey();
        const { payload } = await jose.jwtVerify(token, publicKey, {
            // Don't check issuer/audience since QR tokens are signed with
            // JWT_PRIVATE_KEY (RS256), not the auth signing secret
        });
        return payload;
    } catch (error: any) {
        console.warn('QR verification failed:', error?.message);
        return null;
    }
}
