import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common'
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

	@Get(':id/shows/:showId/seats')
	getShowSeats(@Param('id') id: string, @Param('showId') showId: string) {
		return this.concertsService.getShowSeats(showId)
	}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createConcert(@Body() body: unknown, @CurrentUser() user: AuthTokenPayload) {
		return this.concertsService.createConcert(body, user.sub, user.role)
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
	deleteConcert(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) {
		return this.concertsService.deleteConcert(id, user.sub, user.role)
	}

	@Post(':id/ticket-types')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createTicketType(
		@Param('id') id: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.createTicketType(id, body, user.sub, user.role)
	}

	@Patch(':id/ticket-types/:ticketTypeId')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	updateTicketType(
		@Param('id') id: string,
		@Param('ticketTypeId') ticketTypeId: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.updateTicketType(id, ticketTypeId, body, user.sub, user.role)
	}

	@Delete(':id/ticket-types/:ticketTypeId')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	deleteTicketType(
		@Param('id') id: string,
		@Param('ticketTypeId') ticketTypeId: string,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.deleteTicketType(id, ticketTypeId, user.sub, user.role)
	}

	@Post(':id/shows')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createShow(
		@Param('id') id: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.createShow(id, body, user.sub, user.role)
	}

	@Post(':id/artists')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	assignArtist(
		@Param('id') id: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.assignArtist(id, body, user.sub, user.role)
	}

	@Delete(':id/artists/:artistId')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	removeArtist(
		@Param('id') id: string,
		@Param('artistId') artistId: string,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.removeArtist(id, artistId, user.sub, user.role)
	}

	@Get(':id/gates')
	getConcertGates(@Param('id') id: string) {
		return this.concertsService.getConcertGates(id)
	}

	@Put(':id/gates')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	updateConcertGates(
		@Param('id') id: string,
		@Body() body: unknown,
		@CurrentUser() user: AuthTokenPayload,
	) {
		return this.concertsService.updateConcertGates(id, body, user.sub, user.role)
	}
}
