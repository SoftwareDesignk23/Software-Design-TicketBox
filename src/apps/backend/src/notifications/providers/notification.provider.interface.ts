export interface SendNotificationParams {
	userId: string
	recipient: string
	subject?: string
	content: string
}

export interface INotificationProvider {
	send(params: SendNotificationParams): Promise<boolean>
}
