import { Module } from '@nestjs/common'
import { AiService } from './ai.service.js'
import { AiController } from './ai.controller.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { GeminiProvider } from './providers/gemini.provider.js'
import { CustomAiProvider } from './providers/custom.provider.js'
import { AiProviderFactory } from './providers/ai-provider.factory.js'

@Module({
	imports: [PrismaModule],
	controllers: [AiController],
	providers: [AiService, GeminiProvider, CustomAiProvider, AiProviderFactory],
	exports: [AiService],
})
export class AiModule {}
