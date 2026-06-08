import { Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import { Roles, CurrentUser } from '../auth/auth.decorators.js';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@Post('bio/request')
	@Roles('ADMIN', 'ORGANIZER')
	@UseInterceptors(FileInterceptor('file'))
	async requestBio(
		@Body('concertId') concertId: string,
		@Body('aiProvider') aiProvider: string,
		@UploadedFile() file?: Express.Multer.File,
		@CurrentUser() user?: any
	) {
		if (file && file.mimetype !== 'application/pdf') {
			throw new BadRequestException('Only PDF files are supported.');
		}

		return this.aiService.queueGenerateBioJob(concertId, aiProvider, user?.sub, file);
	}
}
