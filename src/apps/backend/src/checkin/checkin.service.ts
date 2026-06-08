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
				include: { checkInLogs: true },
			})

			if (!ticket) {
				results.push({ ticketId: log.ticketId, status: 'NOT_FOUND' })
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
}
