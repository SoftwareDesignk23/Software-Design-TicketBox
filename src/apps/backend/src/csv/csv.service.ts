import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import crypto from 'crypto';

@Injectable()
export class CsvService {
	private readonly logger = new Logger(CsvService.name);

	constructor(private readonly prisma: PrismaService) {}

	async processGuestlistFile(showId: string, csvData: string, staffId: string) {
		const lines = csvData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
		
		const show = await this.prisma.concertShow.findUnique({
			where: { id: showId },
			include: { concert: { include: { ticketTypes: true } } }
		});

		if (!show) {
			throw new Error('Show not found');
		}

		// Use the first ticket type or assume it's a generic guestlist tier
		const ticketTypeId = show.concert.ticketTypes[0]?.id;

		if (!ticketTypeId) {
			throw new Error('No ticket type available for this show to assign to guests.');
		}

		const results: any[] = [];

		for (const line of lines) {
			// Expected format: email,name,phone
			const [email, name, phone] = line.split(',');
			if (!email) continue;

			// Find or create dummy user just to hold the ticket
			let user = await this.prisma.user.findUnique({ where: { email } });
			if (!user) {
				user = await this.prisma.user.create({
					data: {
						email,
						displayName: name || 'Guest',
						passwordHash: 'guest-no-login',
						role: 'AUDIENCE',
					}
				});
			}

			// Create a dummy booking for the guestlist ticket
			const booking = await this.prisma.booking.create({
				data: {
					userId: user.id,
					status: 'PAID',
					totalAmount: 0,
					currency: 'VND',
					expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
				}
			});

			// Generate ticket
			const ticketId = crypto.randomUUID();
			const code = `GL-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

			await this.prisma.ticket.create({
				data: {
					id: ticketId,
					bookingId: booking.id,
					showId: show.id,
					ticketTypeId,
					ownerId: user.id,
					code,
					qrPayload: JSON.stringify({ ticketId, code, guest: true }),
					status: 'ISSUED',
				}
			});

			results.push({ email, ticketCode: code });
		}

		this.logger.log(`Imported ${results.length} guests for show ${show.id}`);
		return { success: true, count: results.length, guests: results };
	}
}
