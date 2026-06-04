import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { AuthModule } from './auth/auth.module.js'
import { authConfig, authEnvSchema } from './auth/auth.config.js'
import { EventsModule } from './events/events.module.js'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [authConfig],
			validate: (config) => authEnvSchema.parse(config),
		}),
		AuthModule,
		EventsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
