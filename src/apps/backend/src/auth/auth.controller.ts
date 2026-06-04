import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service.js'
import { JwtAuthGuard } from './auth.guards.js'
import { CurrentUser } from './auth.decorators.js'
import type { AuthTokenPayload } from './auth.types.js'

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(@Body() body: { email: string; password: string }) {
		return this.authService.login(body.email, body.password)
	}

	@Post('refresh')
	async refresh(@Body() body: { refreshToken: string }) {
		return this.authService.refresh(body.refreshToken)
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	async logout(@Body() body: { refreshToken: string }) {
		return this.authService.logout(body.refreshToken)
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getCurrentUser(@CurrentUser() user: AuthTokenPayload) {
		return this.authService.getCurrentUser(user.sub, user.role)
	}
}
