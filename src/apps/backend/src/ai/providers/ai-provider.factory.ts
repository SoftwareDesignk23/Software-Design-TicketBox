import { Injectable, Logger } from '@nestjs/common'
import { IAiProvider } from './ai.provider.interface.js'
import { GeminiProvider } from './gemini.provider.js'
import { CustomAiProvider } from './custom.provider.js'
import { AppException } from '../../exception/app-exception.js'
import { ErrorCode } from '../../exception/error-code.js'

@Injectable()
export class AiProviderFactory {
	private readonly logger = new Logger(AiProviderFactory.name)

	constructor(
		private readonly geminiProvider: GeminiProvider,
		private readonly customProvider: CustomAiProvider,
	) {}

	getProvider(): IAiProvider {
		const providerName = process.env.AI_PROVIDER || 'GEMINI'
		this.logger.log(`Using AI Provider: ${providerName}`)

		switch (providerName.toUpperCase()) {
			case 'GEMINI':
				return this.geminiProvider
			case 'CUSTOM':
				return this.customProvider
			default:
				throw new AppException(ErrorCode.InternalServerError, {
					reason: 'unsupported_ai_provider',
					providerName,
				})
		}
	}
}
