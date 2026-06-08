import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { StorageService } from './storage.service.js'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'
import { z } from 'zod'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'

const presignSchema = z.object({
	fileExtension: z.string().min(1),
	contentType: z.string().min(1),
})

@Controller('storage')
export class StorageController {
	constructor(private readonly storageService: StorageService) {}

	@Post('presign')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ADMIN', 'ORGANIZER')
	async generatePresignedUrl(@Body() body: unknown) {
		const parsed = presignSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}
		
		return this.storageService.generatePresignedUrl(
			parsed.data.fileExtension,
			parsed.data.contentType
		)
	}
}
