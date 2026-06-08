import { Injectable } from '@nestjs/common'
import { INotificationProvider } from './notification.provider.interface.js'
import { EmailProvider } from './email.provider.js'
import { InAppProvider } from './in-app.provider.js'
import { AppException } from '../../exception/app-exception.js'
import { ErrorCode } from '../../exception/error-code.js'

@Injectable()
export class NotificationProviderFactory {
	constructor(
		private readonly emailProvider: EmailProvider,
		private readonly inAppProvider: InAppProvider,
	) {}

	getProvider(channel: string): INotificationProvider {
		switch (channel) {
			case 'EMAIL':
				return this.emailProvider
			case 'IN_APP':
				return this.inAppProvider
			default:
				throw new AppException(ErrorCode.InternalServerError, {
					reason: 'unsupported_notification_channel',
					channel,
				})
		}
	}
}
