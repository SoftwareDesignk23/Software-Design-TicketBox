import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { AuthHttpExceptionFilter } from './auth/auth.filter.js'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.useGlobalFilters(new AuthHttpExceptionFilter())
	await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
