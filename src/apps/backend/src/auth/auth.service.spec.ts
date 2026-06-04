import { AuthService } from './auth.service.js'
import { AuthStore } from './auth.store.js'
import { AuthTokenService } from './auth.tokens.js'
import { ConfigType } from '@nestjs/config'
import { authConfig } from './auth.config.js'

class FakeTokenService {
	signAccessToken(payload: { sub: string; role: string; sid: string }) {
		return { token: `token-${payload.sub}-${payload.sid}`, expiresIn: 900 }
	}

	verifyAccessToken(token: string) {
		return { sub: 'user-audience', role: 'AUDIENCE', sid: token }
	}
}

class FakeConfig {
	static get() {
		return {
			issuer: 'ticketbox',
			audience: 'ticketbox-app',
			accessTokenTtlSeconds: 900,
			refreshTokenTtlSeconds: 5,
			signingSecret: 'test-secret-12345678',
		}
	}
}

describe('AuthService', () => {
	let authService: AuthService

	beforeEach(() => {
		const store = new AuthStore()
		const tokens = new FakeTokenService() as unknown as AuthTokenService
		const config = FakeConfig.get() as ConfigType<typeof authConfig>

		authService = new AuthService(store, tokens, config)
	})

	it('rotates refresh tokens on refresh', async () => {
		const login = await authService.login('audience@ticketbox.local', 'password123')
		const refreshed = await authService.refresh(login.refreshToken)

		expect(refreshed.refreshToken).not.toEqual(login.refreshToken)
		expect(refreshed.accessToken).toContain('token-user-audience')
	})

	it('revokes refresh token family on reuse detection', async () => {
		const login = await authService.login('audience@ticketbox.local', 'password123')
		const refreshed = await authService.refresh(login.refreshToken)

		await expect(authService.refresh(login.refreshToken)).rejects.toBeDefined()
		await expect(authService.refresh(refreshed.refreshToken)).rejects.toBeDefined()
	})

	it('revokes refresh session on logout', async () => {
		const login = await authService.login('audience@ticketbox.local', 'password123')

		const result = await authService.logout(login.refreshToken)

		expect(result.revoked).toBe(true)
		await expect(authService.refresh(login.refreshToken)).rejects.toBeDefined()
	})
})
