import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { map } from 'rxjs'
import { HttpResponse } from '../../http-response.js'

@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			map((data) => {
				if (data instanceof HttpResponse) {
					return data
				}

				return HttpResponse.success(data ?? null)
			}),
		)
	}
}
