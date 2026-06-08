import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common'
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
}
