import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { checkinSyncSchema } from './checkin.dto.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'

@Injectable()
export class CheckinService {
	constructor(private readonly prisma: PrismaService) {}

	async syncCheckins(body: unknown, userId: string) {
		const parsed = checkinSyncSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}

		const results: any[] = []
		for (const log of parsed.data.logs) {
			// Find ticket
			const ticket = await this.prisma.ticket.findUnique({
				where: { id: log.ticketId },
				include: { checkInLogs: true, gate: true },
			})

			if (!ticket) {
				results.push({ ticketId: log.ticketId, status: 'NOT_FOUND' })
				continue
			}

			// Validate Gate
			const staff = await this.prisma.user.findUnique({ where: { id: userId } })
			if (staff?.assignedGateId && staff.assignedGateId !== ticket.gateId) {
				results.push({ ticketId: log.ticketId, status: 'INVALID_GATE' })
				continue
			}

			// Conflict resolution: first-valid-check-in wins
			// If ticket is already checked in (in DB)
			const successfulScan = ticket.checkInLogs.find((s) => s.status === 'ACCEPTED')
			
			if (successfulScan) {
				results.push({ ticketId: log.ticketId, status: 'CONFLICT_ALREADY_CHECKED_IN' })
				continue
			}

			// Record new scan
			await this.prisma.checkInLog.create({
				data: {
					ticketId: log.ticketId,
					staffId: userId,
					scannedAt: new Date(log.scannedAt),
					deviceId: log.deviceId,
					status: log.scanResult === 'VALID' ? 'ACCEPTED' : 'INVALID',
				},
			})

			// If valid, update ticket status
			if (log.scanResult === 'VALID') {
				await this.prisma.ticket.update({
					where: { id: log.ticketId },
					data: { status: 'CHECKED_IN', checkedInAt: new Date(log.scannedAt) },
				})
			}

			results.push({ ticketId: log.ticketId, status: 'SYNCED' })
		}

		return { results }
	}

	async getEvents(userId: string, role: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { organizerId: true }
		})

		const organizerId = user?.organizerId

		if (!organizerId && role !== 'ADMIN') {
			return { events: [] }
		}

		const whereClause: any = role === 'ADMIN' ? {} : { organizerId }

		const events = await this.prisma.concert.findMany({
			where: whereClause,
			include: {
				shows: {
					orderBy: { startsAt: 'asc' }
				},
				venue: true,
				gates: true
			},
			orderBy: { createdAt: 'desc' }
		})

		const concerts = events as any[];
		return {
			events: concerts.map(e => ({
				id: e.id,
				title: e.title,
				bannerUrl: e.bannerUrl,
				venueName: e.venue.name,
				shows: e.shows.map((s: any) => ({
					id: s.id,
					startsAt: s.startsAt,
					status: s.status
				})),
				gates: e.gates.map((g: any) => ({
					id: g.id,
					name: g.name,
					capacity: g.capacity,
					type: g.type
				}))
			}))
		}
	}

	async getTickets(eventId: string, userId: string, role: string) {
		if (!eventId) throw new AppException(ErrorCode.ValidationFailed, { reason: 'missing_eventId' })
		
		const shows = await this.prisma.concertShow.findMany({
			where: { concertId: eventId },
			select: { id: true }
		})
		const showIds = shows.map(s => s.id)

		const tickets = await this.prisma.ticket.findMany({
			where: { showId: { in: showIds } },
			select: {
				id: true,
				code: true,
				gate: { select: { id: true, name: true } },
				status: true,
				show: {
					select: { concertId: true }
				},
				booking: {
					select: {
						attendeeName: true,
						attendeeEmail: true,
					}
				}
			}
		})

		return {
			tickets: tickets.map(t => ({
				id: t.id,
				code: t.code,
				gateId: t.gate?.id,
				gate: t.gate?.name,
				status: t.status,
				eventId: t.show.concertId,
				attendeeName: t.booking?.attendeeName || '',
				attendeeEmail: t.booking?.attendeeEmail || '',
			}))
		}
	}


	async syncDown(lastUpdatedStr: string, userId: string, role: string) {
		const lastUpdated = lastUpdatedStr ? new Date(lastUpdatedStr) : new Date(0)

		const recentLogs = await this.prisma.checkInLog.findMany({
			where: {
				scannedAt: { gt: lastUpdated }
			},
			select: {
				ticketId: true,
				status: true,
				scannedAt: true,
			},
			orderBy: { scannedAt: 'asc' }
		})

		// Return unique latest statuses
		const latestStatusMap = new Map<string, any>()
		for (const log of recentLogs) {
			latestStatusMap.set(log.ticketId, {
				ticketId: log.ticketId,
				status: log.status, // We only care if it's ACCEPTED (meaning CHECKED_IN)
				scannedAt: log.scannedAt
			})
		}

		return {
			changes: Array.from(latestStatusMap.values()),
			serverTime: new Date().toISOString()
		}
	}

	async verifyTicket(ticketId: string, userId: string) {
		if (!ticketId) throw new AppException(ErrorCode.ValidationFailed, { reason: 'missing_ticketId' })

		return await this.prisma.$transaction(async (tx) => {
			const ticket = await tx.ticket.findUnique({
				where: { id: ticketId },
			})

			if (!ticket) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'invalid_ticket' })
			}

			// Validate Gate
			const staff = await tx.user.findUnique({ where: { id: userId } })
			if (staff?.assignedGateId && staff.assignedGateId !== ticket.gateId) {
				// Record invalid scan due to wrong gate
				await tx.checkInLog.create({
					data: {
						ticketId,
						staffId: userId,
						scannedAt: new Date(),
						deviceId: 'online',
						status: 'INVALID',
					},
				})
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'wrong_gate' })
			}

			if (ticket.status === 'CHECKED_IN') {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'already_checked_in' })
			}

			// Record scan
			const now = new Date()
			await tx.checkInLog.create({
				data: {
					ticketId,
					staffId: userId,
					scannedAt: now,
					deviceId: 'realtime-verify',
					status: 'ACCEPTED'
				}
			})

			const updatedTicket = await tx.ticket.update({
				where: { id: ticketId },
				data: { status: 'CHECKED_IN', checkedInAt: now }
			})

			return {
				success: true,
				ticket: updatedTicket
			}
		})
	}
}
