import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'
import { UsersService } from './users.service.js'

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	listOrganizers() {
		return this.usersService.listOrganizers()
	}

	@Post()
	createOrganizer(
		@Body() body: {
			email: string
			password?: string
			displayName: string
			phoneNumber?: string
			organizerName: string
			organizerWebsite?: string
			organizerDescription?: string
		}
	) {
		return this.usersService.createOrganizer(body)
	}

	@Patch(':id/status')
	updateStatus(@Param('id') id: string, @Body() body: { active: boolean }) {
		return this.usersService.updateOrganizerStatus(id, body.active)
	}

	@Delete(':id')
	deleteOrganizer(@Param('id') id: string) {
		return this.usersService.deleteOrganizer(id)
	}

	@Get('staff')
	@Roles('ADMIN', 'ORGANIZER')
	listStaff(@Request() req: any) {
		return this.usersService.listStaff(req.user.sub, req.user.role)
	}

	@Patch('staff/:id/status')
	@Roles('ADMIN', 'ORGANIZER')
	updateStaffStatus(@Param('id') id: string, @Body() body: { active: boolean }) {
		return this.usersService.updateOrganizerStatus(id, body.active)
	}

	@Delete('staff/:id')
	@Roles('ADMIN', 'ORGANIZER')
	deleteStaff(@Param('id') id: string) {
		return this.usersService.deleteOrganizer(id)
	}
}
