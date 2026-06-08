import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { StorageService } from './storage.service.js'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'

@Controller('storage')
export class StorageController {
	constructor(private readonly storageService: StorageService) {}

	@Post('upload')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ADMIN', 'ORGANIZER')
	@UseInterceptors(FileInterceptor('file'))
	async uploadFile(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			throw new BadRequestException('Vui lòng chọn file để upload');
		}

		const fileUrl = await this.storageService.uploadFile(
			file.buffer,
			file.mimetype || 'application/octet-stream'
		);

		return {
			success: true,
			fileUrl
		}
	}
}
