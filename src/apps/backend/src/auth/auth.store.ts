import { Injectable } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import type { AssignmentSummary, RefreshSession, Role, User } from './auth.types.js'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AuthStore {
	constructor(private readonly prisma: PrismaService) {}

	private toUser(model: {
		id: string
		email: string
		displayName: string
		role: Role
		passwordHash: string
		createdAt: Date
	}): User {
		return {
			id: model.id,
			email: model.email,
			displayName: model.displayName,
			role: model.role,
			passwordHash: model.passwordHash,
			createdAt: model.createdAt,
		}
	}

	async validateUser(email: string, password: string) {
		const user = await this.prisma.user.findUnique({ where: { email } })

		if (!user) {
			return null
		}

		const matches = await bcrypt.compare(password, user.passwordHash)

		return matches ? this.toUser(user) : null
	}

	async getUserById(userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } })
		return user ? this.toUser(user) : null
	}

	async getAssignmentSummary(userId: string): Promise<AssignmentSummary> {
		const assignments = await this.prisma.eventAssignment.findMany({
			where: { userId },
			select: { role: true, eventId: true },
		})

		return {
			organizerEventIds: assignments
				.filter((assignment) => assignment.role === 'ORGANIZER')
				.map((assignment) => assignment.eventId),
			checkInEventIds: assignments
				.filter((assignment) => assignment.role === 'CHECK_IN_STAFF')
				.map((assignment) => assignment.eventId),
		}
	}

	async isUserAssignedToEvent(userId: string, role: Role, eventId: string) {
		if (role === 'ADMIN') {
			return true
		}

		const assignment = await this.prisma.eventAssignment.findFirst({
			where: { userId, role, eventId },
		})

		return Boolean(assignment)
	}

	async createRefreshSession(userId: string, tokenHash: string, expiresAt: Date) {
		const session = await this.prisma.refreshSession.create({
			data: {
				userId,
				tokenHash,
				expiresAt,
				familyId: randomUUID(),
			},
		})

		return session as RefreshSession
	}

	async rotateRefreshSession(existingSession: RefreshSession, tokenHash: string, expiresAt: Date) {
		const session = await this.prisma.$transaction(async (client) => {
			const nextSession = await client.refreshSession.create({
				data: {
					userId: existingSession.userId,
					familyId: existingSession.familyId,
					tokenHash,
					expiresAt,
				},
			})
			await client.refreshSession.update({
				where: { id: existingSession.id },
				data: {
					revokedAt: new Date(),
					replacedByTokenId: nextSession.id,
				},
			})
			return nextSession
		})

		return session as RefreshSession
	}

	async markSessionUsed(sessionId: string) {
		await this.prisma.refreshSession.update({
			where: { id: sessionId },
			data: { lastUsedAt: new Date() },
		})
	}

	async revokeSession(sessionId: string) {
		await this.prisma.refreshSession.update({
			where: { id: sessionId },
			data: { revokedAt: new Date() },
		})
	}

	async revokeFamily(familyId: string) {
		await this.prisma.refreshSession.updateMany({
			where: { familyId, revokedAt: null },
			data: { revokedAt: new Date() },
		})
	}

	async findSessionByTokenHash(tokenHash: string) {
		const session = await this.prisma.refreshSession.findUnique({
			where: { tokenHash },
		})
		return session as RefreshSession | null
	}

	isSessionExpired(session: RefreshSession, now = new Date()) {
		return session.expiresAt.getTime() <= now.getTime()
	}
}
