export class HttpResponse<TData = unknown> {
	code: string
	message: string
	data: TData

	constructor(code: string, message: string, data: TData) {
		this.code = code
		this.message = message
		this.data = data
	}

	static success<TData>(data: TData, message = 'OK', code = 'SUCCESS') {
		return new HttpResponse(code, message, data)
	}

	static error<TData>(message: string, code = 'ERROR', data: TData | null = null) {
		return new HttpResponse(code, message, data as TData)
	}
}
