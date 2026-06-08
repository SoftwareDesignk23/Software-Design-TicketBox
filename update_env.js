const fs = require('fs');

let raw = fs.readFileSync('keys.json', 'utf16le');
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}
const data = JSON.parse(raw);

// The keys were saved as base64 in keys.json
const privKey = Buffer.from(data.private, 'base64').toString('utf8');
const pubKey = Buffer.from(data.public, 'base64').toString('utf8');

// Base64 encode the final keys so they can sit on one line in .env without newline issues
const privB64 = Buffer.from(privKey).toString('base64');
const pubB64 = Buffer.from(pubKey).toString('base64');

fs.appendFileSync('src/apps/backend/.env', '\nJWT_PRIVATE_KEY="' + privB64 + '"\nJWT_PUBLIC_KEY="' + pubB64 + '"\n');
fs.appendFileSync('src/apps/ui/mobile-checkin/.env', '\nEXPO_PUBLIC_JWT_PUBLIC_KEY="' + pubB64 + '"\n');
