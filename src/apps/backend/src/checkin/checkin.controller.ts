import { Body, Controller, Post, Get, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'
import { CheckinService } from './checkin.service.js'

@Controller('checkin')
export class CheckinController {
	constructor(private readonly checkinService: CheckinService) {}

	@Post('sync')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('CHECK_IN_STAFF', 'ORGANIZER', 'ADMIN')
	async syncCheckins(@Body() body: unknown, @Request() req: any) {
		return this.checkinService.syncCheckins(body, req.user.sub)
	}

	@Get('events')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('CHECK_IN_STAFF', 'ORGANIZER', 'ADMIN')
	async getEvents(@Request() req: any) {
		return this.checkinService.getEvents(req.user.sub, req.user.role)
	}

	@Get('tickets')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('CHECK_IN_STAFF', 'ORGANIZER', 'ADMIN')
	async getTickets(@Request() req: any) {
		return this.checkinService.getTickets(req.query.eventId, req.user.sub, req.user.role)
	}

	@Get('sync-down')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('CHECK_IN_STAFF', 'ORGANIZER', 'ADMIN')
	async syncDown(@Request() req: any) {
		return this.checkinService.syncDown(req.query.lastUpdated, req.user.sub, req.user.role)
	}

	@Post('verify')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('CHECK_IN_STAFF', 'ORGANIZER', 'ADMIN')
	async verify(@Body() body: any, @Request() req: any) {
		return this.checkinService.verifyTicket(body.ticketId, req.user.sub)
	}
}
