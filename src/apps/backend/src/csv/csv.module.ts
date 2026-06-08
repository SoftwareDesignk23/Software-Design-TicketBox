import { Module } from '@nestjs/common'
import { CsvController } from './csv.controller.js'
import { CsvService } from './csv.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
	imports: [PrismaModule],
	controllers: [CsvController],
	providers: [CsvService],
})
export class CsvModule {}
