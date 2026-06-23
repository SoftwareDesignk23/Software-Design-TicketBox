import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import crypto from 'crypto';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import axios from 'axios';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { encryptAES } from '../utils/crypto.util.js';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CsvService {
	private readonly logger = new Logger(CsvService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly amqpConnection: AmqpConnection,
	) {}

	async queueGuestlistFile(showId: string, fileUrl: string, userId: string) {
		// Create job in database
		const job = await this.prisma.backgroundJob.create({
			data: {
				type: 'CSV_GUEST_LIST',
				status: 'PENDING',
				createdBy: userId,
				data: {
					showId,
					fileUrl
				}
			}
		});

		// Removed RabbitMQ publish to delay processing until cron job or manual trigger
		return {
			message: 'Guest list import queued successfully',
			jobId: job.id
		};
	}

	@Cron('0 2 * * *')
	async handleCronGuestlistImport() {
		this.logger.log('Running nightly CSV Guest List Import Cron Job');
		const jobs = await this.prisma.backgroundJob.findMany({
			where: { type: 'CSV_GUEST_LIST', status: 'PENDING' }
		});
		
		for (const job of jobs) {
			this.logger.log(`Publishing CSV job ${job.id} to queue`);
			await this.amqpConnection.publish('ticketbox.exchange', 'job.csv.import', {
				jobId: job.id
			});
		}
	}

	async processGuestlistJob(jobId: string) {
		const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } });
		if (!job || job.status !== 'PENDING') return;

		await this.prisma.backgroundJob.update({
			where: { id: jobId },
			data: { status: 'PROCESSING' }
		});

		try {
			const data = job.data as any;
			const { showId, fileUrl } = data;

			const show = await this.prisma.concertShow.findUnique({
				where: { id: showId },
				include: { concert: { include: { ticketTypes: true } } }
			});

			if (!show) {
				throw new Error('Show not found');
			}

			const ticketType = show.concert.ticketTypes.find(t => t.name.toUpperCase().includes('SVIP')) || show.concert.ticketTypes[0];
			const ticketTypeId = ticketType?.id;

			if (!ticketTypeId) {
				throw new Error('No ticket type available for this show to assign to guests.');
			}

			// Download file as stream
			const response = await axios({
				method: 'get',
				url: fileUrl,
				responseType: 'stream'
			});

			const CHUNK_SIZE = 100;
			let chunk: any[] = [];
			let totalProcessed = 0;
			let successCount = 0;
			const failedRows: any[] = [];

			const processChunk = async (rows: any[]) => {
				for (const row of rows) {
					try {
						const email = row.email || row.Email || row.EMAIL;
						const name = row.name || row.Name || row.NAME || 'Guest';
						const phone = row.phone || row.Phone || row.PHONE || null;
						
						if (!email) {
							failedRows.push({ row, reason: 'Missing email' });
							continue;
						}

						let payloadToPublish: any = null;

						await this.prisma.$transaction(async (tx) => {
							// Upsert User
							const user = await tx.user.upsert({
								where: { email },
								update: {
									...(phone && { phoneNumber: phone })
								},
								create: {
									email,
									displayName: name,
									...(phone && { phoneNumber: phone }),
									passwordHash: 'guest-no-login',
									role: 'AUDIENCE',
								}
							});

							// Check if ticket already exists
							const existingTicket = await tx.ticket.findFirst({
								where: {
									ownerId: user.id,
									showId: show.id
								},
								include: {
									ticketType: true,
									booking: true,
									showSeat: { include: { seat: true } }
								}
							});

							if (existingTicket) {
								// Ticket exists, but did they get the email?
								const sentNotif = await tx.notification.findFirst({
									where: {
										userId: user.id,
										type: 'BOOKING_CONFIRMED',
										channel: 'EMAIL',
										status: 'SENT'
									}
								});

								if (sentNotif) {
									return; // Fully processed and email sent
								} else {
									// Missing email notification! Recover and re-trigger
									const existingSeat = existingTicket.showSeat?.seat;
									const seatLabel = existingSeat ? (existingSeat.row ? `${existingSeat.row}${existingSeat.number}` : existingSeat.label) : null;

									const generatedTickets = [{
										id: existingTicket.id,
										code: existingTicket.code,
										qrPayload: existingTicket.qrPayload,
										ticketName: existingTicket.ticketType.name,
										seat: seatLabel
									}];

									payloadToPublish = {
										bookingId: existingTicket.bookingId,
										userId: user.id,
										attendeeEmail: email,
										message: 'Bạn đã nhận được vé điện tử dành cho Khách mời (Guest List)!',
										tickets: generatedTickets,
										total: 0
									};
									return; // Skip recreation, just publish
								}
							}

							// Find available seat with lock to prevent race conditions
							const availableSeats = await tx.$queryRaw<any[]>`
								SELECT ss.id, s.row, s.number, s.label
								FROM "ShowSeat" ss
								JOIN "Seat" s ON ss."seatId" = s.id
								WHERE ss."showId" = ${show.id}
								  AND ss."ticketTypeId" = ${ticketTypeId}
								  AND ss.status = 'AVAILABLE'
								ORDER BY s.row ASC, s.number ASC
								LIMIT 1
								FOR UPDATE SKIP LOCKED
							`;

							if (!availableSeats || availableSeats.length === 0) {
								throw new Error(`Hết ghế trống trong khu vực ${ticketType.name}`);
							}

							const availableSeat = availableSeats[0];

							// Mark seat as sold
							await tx.showSeat.update({
								where: { id: availableSeat.id },
								data: { status: 'SOLD' }
							});

							// Create Booking and Ticket
							const booking = await tx.booking.create({
								data: {
									userId: user.id,
									status: 'PAID',
									totalAmount: 0,
									currency: 'VND',
									expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
								}
							});

							const ticketId = crypto.randomUUID();
							const code = `GL-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

							// Fetch gatesCount and gateCapacity for this concert
							const concert = await tx.concert.findUnique({
								where: { id: ticketType.concertId }
							})
							const gatesCount = concert?.gatesCount || 1
							const gateCapacity = concert?.gateCapacity || 1000

							const issuedTickets = await tx.ticket.count({
								where: { showId: show.id }
							})
							const gateNumber = Math.min(Math.floor(issuedTickets / gateCapacity) + 1, gatesCount)
							const gate = `Cổng ${gateNumber}`
							
							const payloadData = {
								ticketId,
								code,
								bookingId: booking.id,
								showId: show.id,
								eventId: ticketType.concertId,
								attendeeName: name,
								attendeeEmail: email,
								attendeePhone: phone,
								gate,
								issuedAt: new Date().toISOString(),
								guest: true
							}
							
							const qrPayload = encryptAES(payloadData)

							await tx.ticket.create({
								data: {
									id: ticketId,
									bookingId: booking.id,
									showId: show.id,
									ticketTypeId,
									showSeatId: availableSeat.id, // Assign the seat!
									ownerId: user.id,
									code,
									gate,
									qrPayload: qrPayload,
									status: 'ISSUED',
								}
							});

							const seatLabel = availableSeat.row ? `${availableSeat.row}${availableSeat.number}` : availableSeat.label;
							const ticketName = ticketType.name;

							const generatedTickets = [{
								id: ticketId,
								code: code,
								qrPayload: qrPayload,
								ticketName: ticketName,
								seat: seatLabel
							}];

							payloadToPublish = {
								bookingId: booking.id,
								userId: user.id,
								attendeeEmail: email,
								message: 'Bạn đã nhận được vé điện tử dành cho Khách mời (Guest List)!',
								tickets: generatedTickets,
								total: 0
							};
						});

						if (payloadToPublish) {
							// Trigger email and in-app notifications
							try {
								await this.amqpConnection.publish('ticketbox.exchange', 'payment.success', payloadToPublish);
							} catch (err) {
								this.logger.error(`Failed to publish notification for guest ${email}`, err);
							}
							successCount++;
						}
					} catch (error: any) {
						failedRows.push({ row, reason: error.message });
					}
				}
			};

			const stream = response.data as Readable;
			const parser = stream.pipe(csvParser());
			
			for await (const row of parser) {
				chunk.push(row);
				if (chunk.length >= CHUNK_SIZE) {
					await processChunk(chunk);
					totalProcessed += chunk.length;
					chunk = [];
				}
			}

			// Process remaining
			if (chunk.length > 0) {
				await processChunk(chunk);
				totalProcessed += chunk.length;
			}

			this.logger.log(`Imported ${successCount} guests for show ${show.id}. Failed: ${failedRows.length}`);
			
			await this.prisma.backgroundJob.update({
				where: { id: jobId },
				data: { 
					status: 'COMPLETED', 
					result: { 
						totalProcessed,
						successCount,
						failedCount: failedRows.length,
						failedRows 
					} 
				}
			});

		} catch (error: any) {
			this.logger.error(`Failed to process CSV job ${jobId}`, error);
			await this.prisma.backgroundJob.update({
				where: { id: jobId },
				data: { status: 'FAILED', result: { error: error.message || 'Unknown error' } }
			});
		}
	}
}
