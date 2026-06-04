import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { CurrentUser, Roles } from '../auth/auth.decorators.js'
import type { AuthTokenPayload } from '../auth/auth.types.js'
import { ConcertsService } from './concerts.service.js'

@Controller('concerts')
export class ConcertsController {
	constructor(private readonly concertsService: ConcertsService) {}

	// Khách hàng vẫn có thể muốn xem danh sách concert trước khi đăng nhập nên không thêm authentication và authorization

	@Get()
	listConcerts() {
		return this.concertsService.listConcerts()
	}

	@Get(':id')
	getConcertById(@Param('id') id: string) {
		return this.concertsService.getConcertById(id)
	}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createConcert(@Body() body: unknown, @CurrentUser() user: AuthTokenPayload) {
		return this.concertsService.createConcert(body, user.sub)
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	updateConcert(
		@Param('id') id: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.updateConcert(id, body, user.sub, user.role)
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	deleteConcert(@Param('id') _id: string) {}
}
