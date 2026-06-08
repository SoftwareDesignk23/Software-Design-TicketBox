import { Global, Module } from '@nestjs/common'
import { RabbitMQModule as GoLevelUpRabbitMQModule } from '@golevelup/nestjs-rabbitmq'
import { ConfigService, ConfigModule } from '@nestjs/config'

export const RABBITMQ_SERVICE = 'RABBITMQ_SERVICE'

@Global()
@Module({
	imports: [
		GoLevelUpRabbitMQModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				uri: configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
				exchanges: [
					{
						name: 'ticketbox.exchange',
						type: 'topic',
					},
					{
						name: 'ticketbox.dlx',
						type: 'topic',
					},
				],
				queues: [
					{
						name: 'ticketbox.dlq',
						exchange: 'ticketbox.dlx',
						routingKey: '#',
					},
				],
				connectionInitOptions: { wait: false },
			}),
			inject: [ConfigService],
		}),
	],
	exports: [GoLevelUpRabbitMQModule],
})
export class RabbitMQModule {}
