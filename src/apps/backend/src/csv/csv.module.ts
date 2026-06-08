import { Module } from '@nestjs/common'
import { CsvController } from './csv.controller.js'
import { CsvService } from './csv.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { CsvWorker } from './csv.worker.js'

@Module({
	imports: [PrismaModule],
	controllers: [CsvController],
	providers: [CsvService, CsvWorker],
	exports: [CsvService],
})
export class CsvModule {}
