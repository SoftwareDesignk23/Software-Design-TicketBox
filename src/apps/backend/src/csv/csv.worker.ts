import { Injectable, Logger } from '@nestjs/common'
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'
import { CsvService } from './csv.service.js'

@Injectable()
export class CsvWorker {
	private readonly logger = new Logger(CsvWorker.name)

	constructor(private readonly csvService: CsvService) {}

	@RabbitSubscribe({
		exchange: 'ticketbox.exchange',
		routingKey: 'job.csv.import',
		queue: 'csv.import.queue',
	})
	async handleImportJob(msg: { jobId: string }) {
		this.logger.log(`Received CSV Import job: ${msg.jobId}`)
		try {
			await this.csvService.processGuestlistJob(msg.jobId)
			this.logger.log(`Successfully processed CSV Import job: ${msg.jobId}`)
		} catch (error) {
			this.logger.error(`Error processing CSV Import job ${msg.jobId}`, error)
		}
	}
}
