import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CsvService } from './csv.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import { Roles } from '../auth/auth.decorators.js';

@Controller('csv')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CsvController {
	constructor(private readonly csvService: CsvService) {}

	@Post('import')
	@Roles('ADMIN', 'ORGANIZER')
	async importGuestlist(
		@Body('showId') showId: string,
		@Body('fileUrl') fileUrl: string,
		@Request() req: any
	) {
		return this.csvService.queueGuestlistFile(showId, fileUrl, req.user.sub);
	}
}
