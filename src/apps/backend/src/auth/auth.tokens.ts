import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import jwt from 'jsonwebtoken'
import { authConfig } from './auth.config.js'
import type { AuthTokenPayload } from './auth.types.js'

@Injectable()
export class AuthTokenService {
	constructor(@Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>) {}

	signAccessToken(payload: AuthTokenPayload, noExpiry = false) {
		const signOptions: jwt.SignOptions = {
			issuer: this.config.issuer,
			audience: this.config.audience,
		}
		if (!noExpiry) {
			signOptions.expiresIn = this.config.accessTokenTtlSeconds
		}
		const token = jwt.sign(payload, this.config.signingSecret, signOptions)

		return {
			token,
			expiresIn: noExpiry ? null : this.config.accessTokenTtlSeconds,
		}
	}

	verifyAccessToken(token: string) {
		return jwt.verify(token, this.config.signingSecret, {
			issuer: this.config.issuer,
			audience: this.config.audience,
		}) as AuthTokenPayload & jwt.JwtPayload
	}
}
