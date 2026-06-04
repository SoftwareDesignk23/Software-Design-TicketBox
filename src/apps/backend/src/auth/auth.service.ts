import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, createHash } from 'node:crypto'
import type { ConfigType } from '@nestjs/config'
import { authConfig } from './auth.config.js'
import { AuthTokenService } from './auth.tokens.js'
import { AuthStore } from './auth.store.js'
import { AuthErrorCode, unauthorized } from './auth.errors.js'
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
			unauthorized(AuthErrorCode.AuthInvalidCredentials, 'Invalid credentials.')
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

	async refresh(refreshToken: string) {
		if (!refreshToken) {
			unauthorized(AuthErrorCode.AuthRefreshInvalid, 'Refresh token required.')
		}

		const tokenHash = this.hashToken(refreshToken)
		const session = await this.store.findSessionByTokenHash(tokenHash)

		if (!session) {
			unauthorized(AuthErrorCode.AuthRefreshInvalid, 'Refresh token is invalid.')
		}

		if (session.revokedAt) {
			await this.store.revokeFamily(session.familyId)
			unauthorized(AuthErrorCode.AuthRefreshReused, 'Refresh token reuse detected.')
		}

		if (this.store.isSessionExpired(session)) {
			await this.store.revokeSession(session.id)
			unauthorized(AuthErrorCode.AuthRefreshExpired, 'Refresh token expired.')
		}

		await this.store.markSessionUsed(session.id)

		const user = await this.store.getUserById(session.userId)

		if (!user) {
			unauthorized(AuthErrorCode.AuthInvalid, 'User not found.')
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
			unauthorized(AuthErrorCode.AuthRefreshInvalid, 'Refresh token required.')
		}

		const tokenHash = this.hashToken(refreshToken)
		const session = await this.store.findSessionByTokenHash(tokenHash)

		if (!session) {
			unauthorized(AuthErrorCode.AuthRefreshInvalid, 'Refresh token is invalid.')
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
			unauthorized(AuthErrorCode.AuthInvalid, 'User not found.')
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
