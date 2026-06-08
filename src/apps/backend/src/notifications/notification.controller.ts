import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common'
import { NotificationService } from './notification.service.js'
import { SendNotificationDto } from './notification.dto.js'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'

@Controller('notifications')
export class NotificationController {
	constructor(private readonly notificationService: NotificationService) {}

	@Post('send')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ADMIN', 'ORGANIZER')
	async sendNotification(@Body() body: unknown, @Request() req: any) {
		return this.notificationService.sendNotification(body)
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getUserNotifications(@Request() req: any) {
		return this.notificationService.getUserNotifications(req.user.sub)
	}

	@Post(':id/read')
	@UseGuards(JwtAuthGuard)
	async markAsRead(@Param('id') id: string, @Request() req: any) {
		return this.notificationService.markAsRead(req.user.sub, id)
	}

}
