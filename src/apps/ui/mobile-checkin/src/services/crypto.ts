import * as jose from 'jose';

const pubB64 = process.env.EXPO_PUBLIC_JWT_PUBLIC_KEY || '';
const PUBLIC_KEY_PEM = pubB64 ? atob(pubB64) : '';

export async function decryptAES(token: string): Promise<any> {
    if (!PUBLIC_KEY_PEM) throw new Error("Missing EXPO_PUBLIC_JWT_PUBLIC_KEY in environment variables.");
    try {
        const publicKey = await jose.importSPKI(PUBLIC_KEY_PEM, 'RS256');
        const { payload } = await jose.jwtVerify(token, publicKey);
        return payload;
    } catch (error) {
        return null;
    }
}
