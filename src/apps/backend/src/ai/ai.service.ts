import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'
import { AiProviderFactory } from './providers/ai-provider.factory.js'
import { StorageService } from '../storage/storage.service.js'
import { join } from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { exec } from 'child_process'
import { promisify } from 'util'

@Injectable()
export class AiService {
	private readonly logger = new Logger(AiService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
		private readonly amqpConnection: AmqpConnection,
		private readonly aiProviderFactory: AiProviderFactory,
		private readonly storageService: StorageService,
	) {}

	async queueGenerateBioJob(concertId: string, aiProvider: string, userId: string, file?: Express.Multer.File) {
		const concert = await this.prisma.concert.findUnique({
			where: { id: concertId },
		})

		if (!concert) {
			throw new BadRequestException('Concert not found')
		}

		let pdfFilePath = ''
		if (file) {
			try {
				const tempDir = join(process.cwd(), 'uploads', 'temp')
				if (!fs.existsSync(tempDir)) {
					fs.mkdirSync(tempDir, { recursive: true })
				}
				pdfFilePath = join(tempDir, `${uuidv4()}.pdf`)
				fs.writeFileSync(pdfFilePath, file.buffer)
			} catch (err) {
				this.logger.error('Failed to save PDF file', err)
				throw new BadRequestException('Failed to process PDF file.')
			}
		}

		const job = await this.prisma.backgroundJob.create({
			data: {
				type: 'AI_ARTIST_BIO',
				status: 'PENDING',
				createdBy: userId,
				data: {
					concertId,
					aiProvider: aiProvider || 'gemini',
					pdfFilePath
				}
			}
		})

		await this.amqpConnection.publish('ticketbox.exchange', 'job.ai.bio', {
			jobId: job.id
		})

		return {
			message: 'Job queued successfully',
			jobId: job.id
		}
	}

	async processGenerateBioJob(jobId: string) {
		const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } })
		if (!job || job.status !== 'PENDING') return

		await this.prisma.backgroundJob.update({
			where: { id: jobId },
			data: { status: 'PROCESSING' }
		})

		const data = job.data as any
		const { concertId, aiProvider, pdfFilePath } = data

		let extractedText = ''
		let avatarUrl = ''
		
		if (pdfFilePath && fs.existsSync(pdfFilePath)) {
			try {
				this.logger.log(`Extracting text and avatar via Python for job ${jobId}...`)
				const execAsync = promisify(exec)
				const pythonScript = join(process.cwd(), 'scripts', 'pdf_extractor.py')
				// Depending on OS, path to python executable varies
				const venvPython = process.platform === 'win32' 
					? join(process.cwd(), '.venv', 'Scripts', 'python.exe')
					: join(process.cwd(), '.venv', 'bin', 'python')
				
				const outDir = join(process.cwd(), 'uploads', 'temp', 'avatars')
				if (!fs.existsSync(outDir)) {
					fs.mkdirSync(outDir, { recursive: true })
				}
				
				const { stdout } = await execAsync(`"${venvPython}" "${pythonScript}" "${pdfFilePath}" "${outDir}"`)
				const result = JSON.parse(stdout)
				
				if (result.error) {
					throw new Error(result.error)
				}
				
				extractedText = result.text || ''
				const avatarPath = result.avatar_path
				
				// Upload avatar if exists
				if (avatarPath && fs.existsSync(avatarPath)) {
					const mimeType = avatarPath.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg'
					avatarUrl = await this.storageService.uploadFile(avatarPath, mimeType)
					// Cleanup avatar
					fs.unlinkSync(avatarPath)
				}
				
				// Cleanup PDF
				fs.unlinkSync(pdfFilePath)
			} catch (err) {
				this.logger.error('Python extraction failed', err)
			}
		}

		const prompt = `Dựa vào thông tin press kit/hồ sơ sau đây, hãy tìm tên của nghệ sĩ và tóm tắt một đoạn giới thiệu ngắn gọn (khoảng 3-5 câu) bằng tiếng Việt cho nghệ sĩ này. 
Trả về ĐÚNG định dạng JSON sau, KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON:
{ "name": "Tên nghệ sĩ", "bio": "Đoạn giới thiệu..." }

Thông tin press kit:
${extractedText.substring(0, 10000)}`

		try {
			let artistInfo = { name: "Nghệ sĩ chưa có tên", bio: "" };

			if (extractedText) {
				try {
					this.logger.log(`Calling AI Provider (${aiProvider}) for concert ${concertId}...`)
					const provider = this.aiProviderFactory.getProvider(aiProvider)
					const responseText = await provider.generateBio(prompt)
					
					// Try to parse JSON from AI response
					const jsonMatch = responseText.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						artistInfo = JSON.parse(jsonMatch[0]);
					} else {
						artistInfo.bio = responseText;
					}
				} catch (e) {
					this.logger.warn('AI generation failed, continuing with fallback info', e);
				}
			}

			if (!artistInfo.name || artistInfo.name === "Nghệ sĩ chưa có tên") {
				// Generate a random name if everything failed but we still want to save avatar
				artistInfo.name = `Artist_${Math.floor(Math.random() * 10000)}`;
			}
			
			// Find or create artist
			let artist = await this.prisma.artist.findFirst({
				where: { name: artistInfo.name }
			});

			if (!artist) {
				artist = await this.prisma.artist.create({
					data: {
						name: artistInfo.name,
						...(artistInfo.bio && { bio: artistInfo.bio }),
						...(avatarUrl && { avatarUrl })
					}
				});
			} else {
				artist = await this.prisma.artist.update({
					where: { id: artist.id },
					data: { 
						...(artistInfo.bio && { bio: artistInfo.bio }),
						...(avatarUrl && { avatarUrl })
					}
				});
			}

			// Link artist to concert
			await this.prisma.concertArtist.upsert({
				where: { concertId_artistId: { concertId, artistId: artist.id } },
				update: { role: 'Nghệ sĩ chính' },
				create: { concertId, artistId: artist.id, role: 'Nghệ sĩ chính' }
			});

			await this.prisma.backgroundJob.update({
				where: { id: jobId },
				data: { status: 'COMPLETED', result: { artistId: artist.id, name: artist.name, bio: artist.bio, avatarUrl: artist.avatarUrl } }
			})

		} catch (err: any) {
			this.logger.error('Fatal error linking artist', err)
			await this.prisma.backgroundJob.update({
				where: { id: jobId },
				data: { status: 'FAILED', result: { error: err.message || 'Fatal Error' } }
			})
		}
	}

	async generateShowNotes(showId: string) {
		const show = await this.prisma.concertShow.findUnique({
			where: { id: showId },
			include: { concert: true },
		})

		if (!show) {
			throw new BadRequestException('Show not found')
		}

		// Mock generating show notes with AI
		this.logger.log(`Generating show notes for show of ${show.concert.title}...`)
		const generatedNotes = `AI Show Notes: Prepare for an unforgettable evening at ${show.concert.title}! Expect dazzling lights, incredible sound, and a night full of memories.`

		return { showId, notes: generatedNotes }
	}
}

