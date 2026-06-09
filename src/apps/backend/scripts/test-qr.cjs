const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ticket = await prisma.ticket.findFirst({
        where: { qrPayload: { startsWith: 'eyJ' } },
        select: { id: true, code: true, gate: true, qrPayload: true }
    });
    
    console.log('Ticket code:', ticket.code);
    console.log('qrPayload starts with eyJ:', ticket.qrPayload.startsWith('eyJ'));
    console.log('qrPayload length:', ticket.qrPayload.length);
    
    const pubB64 = process.env.JWT_PUBLIC_KEY || '';
    if (!pubB64) {
        console.log('JWT_PUBLIC_KEY not set, verifying with private key instead...');
        // Still parse (no verify) to check payload
        const decoded = jwt.decode(ticket.qrPayload);
        console.log('DECODED (unverified) PAYLOAD:');
        console.log('  ticketId:', decoded.ticketId);
        console.log('  eventId:', decoded.eventId);
        console.log('  gate:', decoded.gate);
        console.log('  attendeeName:', decoded.attendeeName);
        console.log('  code:', decoded.code);
    } else {
        const PUBLIC_KEY = Buffer.from(pubB64.replace(/"/g, ''), 'base64').toString('utf8');
        const decoded = jwt.verify(ticket.qrPayload, PUBLIC_KEY, { algorithms: ['RS256'] });
        console.log('DECODED (verified) PAYLOAD:');
        console.log('  ticketId:', decoded.ticketId);
        console.log('  eventId:', decoded.eventId);
        console.log('  gate:', decoded.gate);
        console.log('  attendeeName:', decoded.attendeeName);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
