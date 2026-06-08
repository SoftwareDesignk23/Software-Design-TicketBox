import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { ConfigType } from '@nestjs/config'
import { authConfig } from './auth.config.js'
import { AuthTokenService } from './auth.tokens.js'
import { AuthStore } from './auth.store.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import type { AuthenticatedUserProfile, AuthTokenPayload, Role } from './auth.types.js'

@Injectable()
export class AuthService {
	constructor(
		private readonly store: AuthStore,
		private readonly tokens: AuthTokenService,
		@Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
	) {}

	async login(email: string, password: string) {
		const user = await this.store.validateUser(email, password)

		if (!user) {
			throw new AppException(ErrorCode.AuthInvalidCredentials)
		}

		if (!user.isActive) {
			throw new AppException(ErrorCode.AuthInvalidCredentials, {
				reason: 'account_disabled'
			})
		}

		const refreshToken = this.generateRefreshToken()
		const refreshTokenHash = this.hashToken(refreshToken)
		const session = await this.store.createRefreshSession(
			user.id,
			refreshTokenHash,
			this.refreshExpiryDate(),
		)

		const accessToken = this.tokens.signAccessToken({
			sub: user.id,
			role: user.role,
			sid: session.id,
		})

		return {
			accessToken: accessToken.token,
			refreshToken,
			expiresIn: accessToken.expiresIn,
			user: await this.buildProfile(user.id, user.role),
		}
	}

	async register(email: string, passwordPlain: string, displayName: string, role: Role) {
		const existingUser = await this.store.getUserByEmail(email);
		if (existingUser) {
			throw new AppException(ErrorCode.ValidationFailed, {
				reason: 'email_already_exists',
			})
		}

		const passwordHash = await bcrypt.hash(passwordPlain, 10);
		const user = await this.store.createUser(email, passwordHash, displayName, role);

		const refreshToken = this.generateRefreshToken()
		const refreshTokenHash = this.hashToken(refreshToken)
		const session = await this.store.createRefreshSession(
			user.id,
			refreshTokenHash,
			this.refreshExpiryDate(),
		)

		const accessToken = this.tokens.signAccessToken({
			sub: user.id,
			role: user.role,
			sid: session.id,
		})

		return {
			accessToken: accessToken.token,
			refreshToken,
			expiresIn: accessToken.expiresIn,
			user: await this.buildProfile(user.id, user.role),
		}
	}

	async createStaff(email: string, passwordPlain: string, displayName: string, creatorId: string, creatorRole: Role) {
		const existingUser = await this.store.getUserByEmail(email);
		if (existingUser) {
			throw new AppException(ErrorCode.ValidationFailed, {
				reason: 'email_already_exists',
			})
		}

		let organizerId: string | undefined;
		if (creatorRole === 'ORGANIZER') {
			const creator = await this.store.getUserById(creatorId);
			if (!creator || !creator.organizerId) {
				throw new AppException(ErrorCode.AuthForbidden, { reason: 'not_linked_to_organizer' })
			}
			organizerId = creator.organizerId;
		}

		const passwordHash = await bcrypt.hash(passwordPlain, 10);
		const user = await this.store.createUser(email, passwordHash, displayName, 'CHECK_IN_STAFF', organizerId);

		return {
			user: await this.buildProfile(user.id, user.role),
		}
	}

	async refresh(refreshToken: string) {
		if (!refreshToken) {
			throw new AppException(ErrorCode.AuthRefreshRequired)
		}

		const tokenHash = this.hashToken(refreshToken)
		const session = await this.store.findSessionByTokenHash(tokenHash)

		if (!session) {
			throw new AppException(ErrorCode.AuthRefreshInvalid)
		}

		if (session.revokedAt) {
			await this.store.revokeFamily(session.familyId)
			throw new AppException(ErrorCode.AuthRefreshReused)
		}

		if (this.store.isSessionExpired(session)) {
			await this.store.revokeSession(session.id)
			throw new AppException(ErrorCode.AuthRefreshExpired)
		}

		await this.store.markSessionUsed(session.id)

		const user = await this.store.getUserById(session.userId)

		if (!user) {
			throw new AppException(ErrorCode.AuthUserNotFound)
		}

		const nextRefreshToken = this.generateRefreshToken()
		const nextTokenHash = this.hashToken(nextRefreshToken)
		const nextSession = await this.store.rotateRefreshSession(
			session,
			nextTokenHash,
			this.refreshExpiryDate(),
		)

		const accessToken = this.tokens.signAccessToken({
			sub: user.id,
			role: user.role,
			sid: nextSession.id,
		})

		return {
			accessToken: accessToken.token,
			refreshToken: nextRefreshToken,
			expiresIn: accessToken.expiresIn,
			user: await this.buildProfile(user.id, user.role),
		}
	}

	async logout(refreshToken: string) {
		if (!refreshToken) {
			throw new AppException(ErrorCode.AuthRefreshRequired)
		}

		const tokenHash = this.hashToken(refreshToken)
		const session = await this.store.findSessionByTokenHash(tokenHash)

		if (!session) {
			throw new AppException(ErrorCode.AuthRefreshInvalid)
		}

		await this.store.revokeSession(session.id)

		return { revoked: true }
	}

	async getCurrentUser(userId: string, role: Role): Promise<AuthenticatedUserProfile> {
		return this.buildProfile(userId, role)
	}

	verifyAccessToken(token: string): AuthTokenPayload & { exp?: number; iat?: number } {
		return this.tokens.verifyAccessToken(token)
	}

	private async buildProfile(userId: string, role: Role): Promise<AuthenticatedUserProfile> {
		const user = await this.store.getUserById(userId)

		if (!user) {
			throw new AppException(ErrorCode.AuthUserNotFound)
		}

		return {
			id: user.id,
			email: user.email,
			displayName: user.displayName,
			role: user.role,
			assignments: await this.store.getAssignmentSummary(user.id),
		}
	}

	private generateRefreshToken() {
		return randomBytes(48).toString('hex')
	}

	private hashToken(token: string) {
		return createHash('sha256').update(token).digest('hex')
	}

	private refreshExpiryDate() {
		return new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000)
	}
}
