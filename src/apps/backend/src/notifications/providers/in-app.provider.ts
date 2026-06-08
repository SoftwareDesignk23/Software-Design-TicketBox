import { Injectable } from '@nestjs/common'
import { INotificationProvider, SendNotificationParams } from './notification.provider.interface.js'

@Injectable()
export class InAppProvider implements INotificationProvider {
	async send(params: SendNotificationParams): Promise<boolean> {
		// Mock sending in-app push notification
		console.log(`Sending in-app push to user ${params.userId} with content: ${params.content}`)
		return true
	}
}
