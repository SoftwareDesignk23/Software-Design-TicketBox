import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { AuthHttpExceptionFilter } from './auth/auth.filter.js'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.enableShutdownHooks()
	app.useGlobalFilters(new AuthHttpExceptionFilter())
	app.setGlobalPrefix('api/v1', {
		exclude: ['health'],
	})
	await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
