const fs = require('fs');
const jwt = require('jsonwebtoken');

// Read backend .env
const envText = fs.readFileSync('../.env', 'utf8');
const getEnvVal = (key) => {
    const line = envText.split('\n').find(l => l.startsWith(key + '='));
    if (!line) return '';
    return line.replace(key + '=', '').replace(/"/g, '').trim();
};

const privB64 = getEnvVal('JWT_PRIVATE_KEY');
const pubB64 = getEnvVal('JWT_PUBLIC_KEY');

const PRIVATE_KEY = privB64 ? Buffer.from(privB64, 'base64').toString('utf8') : '';
const PUBLIC_KEY = pubB64 ? Buffer.from(pubB64, 'base64').toString('utf8') : '';

console.log('=== BACKEND KEYS ===');
console.log('Private key loaded:', !!PRIVATE_KEY, '| first line:', PRIVATE_KEY.split('\n')[0]);
console.log('Public key loaded:', !!PUBLIC_KEY, '| first line:', PUBLIC_KEY.split('\n')[0]);

// Read mobile .env
const mobileEnvText = fs.readFileSync('../../ui/mobile-checkin/.env', 'utf8');
const getMobileEnvVal = (key) => {
    const line = mobileEnvText.split('\n').find(l => l.startsWith(key + '='));
    if (!line) return '';
    return line.replace(key + '=', '').replace(/"/g, '').trim();
};

const mobilePubB64 = getMobileEnvVal('EXPO_PUBLIC_JWT_PUBLIC_KEY');
const MOBILE_PUBLIC_KEY = mobilePubB64 ? Buffer.from(mobilePubB64, 'base64').toString('utf8') : '';

console.log('\n=== MOBILE KEY ===');
console.log('Mobile public key loaded:', !!MOBILE_PUBLIC_KEY, '| first line:', MOBILE_PUBLIC_KEY.split('\n')[0]);

// Check if keys match
console.log('\n=== KEY MATCH ===');
console.log('Backend pub == Mobile pub:', PUBLIC_KEY.trim() === MOBILE_PUBLIC_KEY.trim());

// Sign a test payload and verify with mobile key
try {
    const testPayload = { ticketId: 'test-123', eventId: 'event-abc' };
    const token = jwt.sign(testPayload, PRIVATE_KEY, { algorithm: 'RS256' });
    console.log('\n=== JWT SIGN TEST ===');
    console.log('Token signed OK, starts with:', token.substring(0, 40));

    // Verify with backend public key
    const decoded1 = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    console.log('Verify with BACKEND pub key: OK', decoded1.ticketId);

    // Verify with mobile public key
    const decoded2 = jwt.verify(token, MOBILE_PUBLIC_KEY, { algorithms: ['RS256'] });
    console.log('Verify with MOBILE pub key: OK', decoded2.ticketId);

    // Now test with a real ticket from DB
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.ticket.findFirst({
        where: { qrPayload: { startsWith: 'eyJ' } },
        select: { id: true, code: true, qrPayload: true }
    }).then(ticket => {
        console.log('\n=== REAL TICKET QR TEST ===');
        console.log('Ticket code:', ticket.code);
        console.log('qrPayload starts with:', ticket.qrPayload.substring(0, 40));
        try {
            const d = jwt.verify(ticket.qrPayload, MOBILE_PUBLIC_KEY, { algorithms: ['RS256'] });
            console.log('VERIFY WITH MOBILE KEY: SUCCESS');
            console.log('  ticketId:', d.ticketId);
            console.log('  eventId:', d.eventId);
            console.log('  attendeeName:', d.attendeeName);
            console.log('  gate:', d.gate);
        } catch(e) {
            console.log('VERIFY WITH MOBILE KEY: FAILED -', e.message);
        }
        prisma.$disconnect();
    });
} catch(e) {
    console.log('ERROR:', e.message);
}
