const fs = require('fs');
const jsrsasign = require('jsrsasign');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken'); // For backend generation test

// --- 1. MÔ PHỎNG BACKEND (TẠO JWT) ---
// Đọc key từ backend .env
const backendEnv = fs.readFileSync('../.env', 'utf8');
const privB64 = backendEnv.split('\n').find(l => l.startsWith('JWT_PRIVATE_KEY=')).replace('JWT_PRIVATE_KEY=', '').replace(/"/g, '').trim();
const PRIVATE_KEY = Buffer.from(privB64, 'base64').toString('utf8');

const testPayload = {
  ticketId: "test-123456",
  eventId: "event-abc",
  code: "TB-XYZ",
  gate: "Cổng 2",
  attendeeName: "Nguyễn Văn A"
};

// Backend tạo JWT
const backendToken = jwt.sign(testPayload, PRIVATE_KEY, { algorithm: 'RS256' });
console.log("=== 1. TẠO QR TỪ BACKEND ===");
console.log("Token tạo ra (mô phỏng nội dung mã QR):", backendToken.substring(0, 50) + "...");

// --- 2. MÔ PHỎNG MOBILE (GIẢI MÃ BẰNG JSRSASIGN + CRYPTO-JS) ---
// Đọc public key b64 từ mobile .env
const mobileEnv = fs.readFileSync('../../ui/mobile-checkin/.env', 'utf8');
const pubB64 = mobileEnv.split('\n').find(l => l.startsWith('EXPO_PUBLIC_JWT_PUBLIC_KEY=')).replace('EXPO_PUBLIC_JWT_PUBLIC_KEY=', '').replace(/"/g, '').trim();

function getPublicKeyPem() {
  const words = CryptoJS.enc.Base64.parse(pubB64);
  const pem = CryptoJS.enc.Utf8.stringify(words);
  return pem;
}

console.log("\n=== 2. MOBILE GIẢI MÃ ===");
try {
  const pem = getPublicKeyPem();
  console.log("Đã giải mã Base64 sang PEM thành công. Độ dài PEM:", pem.length);
  
  // Test if it has newlines
  console.log("PEM format check (lines):", pem.split('\n').length);
  
  // Load key bằng jsrsasign
  const publicKey = jsrsasign.KEYUTIL.getKey(pem);
  console.log("Load RSAKey object thành công!");

  // Verify JWT bằng jsrsasign (đúng như trong crypto.ts)
  const isValid = jsrsasign.KJUR.jws.JWS.verifyJWT(backendToken, publicKey, { alg: ['RS256'] });
  
  if (isValid) {
    console.log("✅ Verify JWT THÀNH CÔNG!");
    const payloadObj = jsrsasign.KJUR.jws.JWS.parse(backendToken).payloadObj;
    console.log("Dữ liệu trong QR:", payloadObj);
  } else {
    console.log("❌ Verify JWT THẤT BẠI (Chữ ký không khớp hoặc key sai)");
  }
} catch (error) {
  console.log("❌ LỖI TRONG QUÁ TRÌNH GIẢI MÃ:", error.message);
}
