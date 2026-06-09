const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY 
    ? Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf8') 
    : '';

async function fixTickets() {
  if (!PRIVATE_KEY) {
      console.log('Error: No JWT_PRIVATE_KEY');
      return;
  }
  
  const tickets = await prisma.ticket.findMany({
      include: { show: true }
  });
  
  let fixed = 0;
  for (const t of tickets) {
    if (!t.qrPayload || !t.qrPayload.startsWith('eyJ')) {
        const payload = {
            ticketId: t.id,
            eventId: t.show?.concertId || "unknown-event",
            attendeeName: "Guest",
            code: t.code,
            gate: "Cổng mặc định"
        };
        const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
        await prisma.ticket.update({
            where: { id: t.id },
            data: { qrPayload: token }
        });
        fixed++;
        console.log(`Fixed ticket: ${t.code}`);
    }
  }
  console.log(`Done! Fixed ${fixed} old tickets.`);
}

fixTickets().finally(() => prisma.$disconnect());
