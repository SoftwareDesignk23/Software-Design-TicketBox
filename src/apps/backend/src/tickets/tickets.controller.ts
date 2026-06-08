import { Controller, Get, UseGuards, Request } from '@nestjs/common'
import { TicketsService } from './tickets.service.js'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'

@Controller('tickets')
export class TicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@Get()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('AUDIENCE')
	async getUserTickets(@Request() req: any) {
		return this.ticketsService.getUserTickets(req.user.sub)
	}
}
