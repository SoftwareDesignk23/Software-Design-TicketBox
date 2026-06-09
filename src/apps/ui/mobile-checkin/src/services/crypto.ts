import { KEYUTIL, KJUR, RSAKey } from 'jsrsasign';

const pubB64 = process.env.EXPO_PUBLIC_JWT_PUBLIC_KEY || '';

let cachedPublicKey: RSAKey | null = null;

function getPublicKeyPem(): string {
  if (!pubB64) throw new Error('Missing EXPO_PUBLIC_JWT_PUBLIC_KEY');
  return globalThis.atob(pubB64);
}

function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  cachedPublicKey = KEYUTIL.getKey(getPublicKeyPem()) as RSAKey;
  return cachedPublicKey;
}

/**
 * Verify and decode a JWT-signed QR payload.
 * Returns the decoded payload on success, or null if verification fails.
 */
export async function decryptAES(token: string): Promise<any> {
  try {
    const publicKey = getPublicKey();
    const isValid = KJUR.jws.JWS.verifyJWT(token, publicKey, { alg: ['RS256'] });
    if (!isValid) return null;
    return KJUR.jws.JWS.parse(token).payloadObj;
  } catch (error: any) {
    console.warn('QR verification failed:', error?.message);
    return null;
  }
}
