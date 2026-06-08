import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { ConfigService } from '@nestjs/config'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
import { GoogleGenAI } from '@google/genai'

@Injectable()
export class AiService {
	private readonly logger = new Logger(AiService.name)
	private readonly ai: GoogleGenAI

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
		const apiKey = this.configService.get<string>('GEMINI_API_KEY')
		if (apiKey) {
			this.ai = new GoogleGenAI({ apiKey })
		} else {
			this.logger.warn('GEMINI_API_KEY is not set. AI features may not work.')
		}
	}

	async generateBio(artistId: string, file?: Express.Multer.File) {
		const artist = await this.prisma.artist.findUnique({
			where: { id: artistId },
		})

		if (!artist) {
			throw new BadRequestException('Artist not found')
		}

		let prompt = `Bạn là một chuyên gia viết tiểu sử nghệ sĩ. Hãy viết một đoạn giới thiệu ngắn gọn (khoảng 3-5 câu) bằng tiếng Việt cho nghệ sĩ có tên là ${artist.name}. Đoạn giới thiệu cần làm nổi bật phong cách âm nhạc và sự nghiệp của nghệ sĩ.`

		if (file) {
			try {
				const pdfData = await pdfParse(file.buffer)
				const extractedText = pdfData.text.substring(0, 5000) // Limit context length
				prompt = `Bạn là một chuyên gia viết tiểu sử nghệ sĩ. Dựa vào thông tin press kit sau đây, hãy tóm tắt và viết một đoạn giới thiệu ngắn gọn (khoảng 3-5 câu) bằng tiếng Việt cho nghệ sĩ tên là ${artist.name}:\n\n${extractedText}`
			} catch (err) {
				this.logger.error('Failed to parse PDF file', err)
				throw new BadRequestException('Failed to extract text from PDF file.')
			}
		}

		let generatedBio = `This is an AI-generated biography for the amazing artist ${artist.name}.`

		if (this.ai) {
			try {
				this.logger.log(`Calling Gemini API for artist ${artist.name}...`)
				const response = await this.ai.models.generateContent({
					model: 'gemini-2.5-flash',
					contents: prompt,
				})
				generatedBio = response.text || generatedBio
			} catch (err) {
				this.logger.error('Gemini API error', err)
				// Fallback to basic if API fails
				generatedBio = `(AI Error: Không thể tạo tiểu sử lúc này) ${artist.name} là một nghệ sĩ tài năng.`
			}
		}

		// Save directly to the artist's bio
		const updatedArtist = await this.prisma.artist.update({
			where: { id: artistId },
			data: { bio: generatedBio },
		})

		return updatedArtist
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

