export const RoleValues = ['AUDIENCE', 'ORGANIZER', 'CHECK_IN_STAFF', 'ADMIN'] as const

export type Role = (typeof RoleValues)[number]

export interface User {
	id: string
	email: string
	displayName: string
	role: Role
	passwordHash: string
	isActive: boolean
	createdAt: Date
	organizerId?: string | null
}

export interface RefreshSession {
	id: string
	familyId: string
	userId: string
	tokenHash: string
	expiresAt: Date
	createdAt: Date
	revokedAt?: Date
	replacedByTokenId?: string
	lastUsedAt?: Date
}

export interface ConcertAssignment {
	userId: string
	role: 'ORGANIZER' | 'CHECK_IN_STAFF'
	concertIds: string[]
}

export interface AssignmentSummary {
	organizerConcertIds: string[]
	checkInConcertIds: string[]
}

export interface AuthenticatedUserProfile {
	id: string
	email: string
	displayName: string
	role: Role
	assignments: AssignmentSummary
}

export interface AuthTokenPayload {
	sub: string
	role: Role
	sid: string
}
