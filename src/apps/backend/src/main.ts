import { NestFactory } from '@nestjs/core'

import { json, urlencoded } from 'express'
import { AppModule } from './app.module.js'
import { GlobalExceptionFilter } from './exception/catch-global.js'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.useGlobalFilters(new GlobalExceptionFilter())
	app.enableCors({
		origin: true,
		credentials: true,
	})
	app.use(json({ limit: '50mb' }))
	app.use(urlencoded({ extended: true, limit: '50mb' }))
	app.setGlobalPrefix('api/v1', {
		exclude: ['health'],
	})

	await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
