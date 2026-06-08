import { Module } from '@nestjs/common'
import { AiService } from './ai.service.js'
import { AiController } from './ai.controller.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { StorageModule } from '../storage/storage.module.js'
import { GeminiProvider } from './providers/gemini.provider.js'
import { CustomAiProvider } from './providers/custom.provider.js'
import { AiProviderFactory } from './providers/ai-provider.factory.js'
import { AiWorker } from './ai.worker.js'

@Module({
	imports: [PrismaModule, StorageModule],
	controllers: [AiController],
	providers: [AiService, GeminiProvider, CustomAiProvider, AiProviderFactory, AiWorker],
	exports: [AiService],
})
export class AiModule {}
