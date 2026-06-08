const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const privB64 = process.env.JWT_PRIVATE_KEY || '';
const PRIVATE_KEY = privB64 ? Buffer.from(privB64.replace(/"/g, ''), 'base64').toString('utf8') : '';

async function main() {
    if (!PRIVATE_KEY) {
        console.error('JWT_PRIVATE_KEY not set');
        process.exit(1);
    }

    console.log('Private key loaded.');

    // Get all tickets with their related data
    const tickets = await prisma.ticket.findMany({
        include: {
            show: {
                include: {
                    concert: true
                }
            },
            booking: true,
        }
    });

    console.log(`Found ${tickets.length} tickets to re-sign.`);

    let updated = 0;
    for (const ticket of tickets) {
        const payloadData = {
            ticketId: ticket.id,
            code: ticket.code,
            bookingId: ticket.bookingId,
            showId: ticket.showId,
            eventId: ticket.show.concertId,
            attendeeName: ticket.booking?.attendeeName || 'Guest',
            attendeeEmail: ticket.booking?.attendeeEmail || '',
            attendeePhone: ticket.booking?.attendeePhone || '',
            gate: ticket.gate || 'Cổng 1',
            issuedAt: (ticket.createdAt || new Date()).toISOString(),
        };

        const qrPayload = jwt.sign(payloadData, PRIVATE_KEY, { algorithm: 'RS256' });

        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { 
                qrPayload,
                gate: ticket.gate || 'Cổng 1'
            }
        });

        updated++;
        if (updated % 10 === 0) console.log(`  Updated ${updated}/${tickets.length}`);
    }

    console.log(`Done! Updated ${updated} tickets with JWT-signed QR payloads.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
