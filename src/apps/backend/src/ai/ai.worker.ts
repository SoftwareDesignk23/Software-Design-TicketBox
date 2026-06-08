import { Injectable, Logger } from '@nestjs/common'
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'
import { AiService } from './ai.service.js'

@Injectable()
export class AiWorker {
	private readonly logger = new Logger(AiWorker.name)

	constructor(private readonly aiService: AiService) {}

	@RabbitSubscribe({
		exchange: 'ticketbox.exchange',
		routingKey: 'job.ai.bio',
		queue: 'ai.bio.queue',
	})
	async handleGenerateBioJob(msg: { jobId: string }) {
		this.logger.log(`Received AI Bio job: ${msg.jobId}`)
		try {
			await this.aiService.processGenerateBioJob(msg.jobId)
			this.logger.log(`Successfully processed AI Bio job: ${msg.jobId}`)
		} catch (error) {
			this.logger.error(`Error processing AI Bio job ${msg.jobId}`, error)
			// Returning NACK could be done if we throw, but here we handled the error in processGenerateBioJob 
			// and updated the DB status to FAILED. So we can just return normally to ACK the message.
		}
	}
}
