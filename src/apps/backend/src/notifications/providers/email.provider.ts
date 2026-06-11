import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { INotificationProvider, SendNotificationParams } from './notification.provider.interface.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

@Injectable()
export class EmailProvider implements INotificationProvider {
	private resend: Resend | null = null

	constructor() {
		const apiKey = process.env.API_KEY_EMAIL
		if (apiKey) {
			this.resend = new Resend(apiKey)
		} else {
			console.warn('API_KEY_EMAIL is not set. Emails will be mocked.')
		}
	}

	async send(params: SendNotificationParams): Promise<boolean> {
		try {
			// Read template
			const templatePath = path.join(__dirname, '../templates/default-email.html')
			let html = ''
			try {
				html = fs.readFileSync(templatePath, 'utf8')
			} catch (e) {
				console.error('Template not found, using raw content', e)
				html = `<h1>${params.subject}</h1><p>${params.content}</p>`
			}

			const subject = params.subject || 'TicketBox Notification'

			// Try to parse content to see if it's a booking payload
			let niceContent = params.content
			try {
				const payload = JSON.parse(params.content)
				if (payload && payload.tickets) {
					// It's a booking confirmation!
					niceContent = `
						<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
							<div style="background-color: #f4511e; color: white; padding: 20px; text-align: center;">
								<h2 style="margin: 0;">TicketBox - Đặt vé thành công!</h2>
							</div>
							<div style="padding: 24px;">
								<p style="font-size: 16px; color: #333;">Cảm ơn bạn đã tin tưởng. Vé của bạn đã được phát hành.</p>
								<div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
									<h3 style="margin-top: 0;">Thông tin đơn hàng</h3>
									<ul style="padding-left: 20px; line-height: 1.6;">
										${payload.tickets.map((t: any) => `<li>Vé ${t.ticketName} ${t.seat ? `(Ghế: ${t.seat})` : ''}</li>`).join('')}
									</ul>
									<p><strong>Tổng thanh toán:</strong> ${payload.total} VND</p>
								</div>
								
								<div style="margin: 30px 0;">
									<p style="margin-bottom: 16px; color: #666; font-size: 14px; text-align: center;">Danh sách mã QR check-in sự kiện:</p>
									${payload.tickets.map((t: any) => `
										<div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed #ddd;">
											<p style="font-weight: bold; margin-bottom: 8px; color: #333;">${t.ticketName} ${t.seat ? ` - Ghế: ${t.seat}` : ''}</p>
											<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(t.qrPayload || t.id)}" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: white;" />
										</div>
									`).join('')}
								</div>
								<a href="http://localhost:5173/tickets" style="display: block; width: 100%; text-align: center; background-color: #f4511e; color: white; padding: 12px 0; text-decoration: none; border-radius: 6px; font-weight: bold;">Xem vé trên ứng dụng</a>
							</div>
						</div>
					`
				}
			} catch (e) {
				// Not JSON, just use as is
			}

			// Replace template variables
			html = html.replace('{{subject}}', subject)
			html = html.replace('{{content}}', niceContent)

			if (this.resend) {
				const data = await this.resend.emails.send({
					from: 'TicketBox <ticketbox@email.lethanhcong.site>',
					to: params.recipient,
					subject: subject,
					html: html,
				})

				if (data.error) {
					console.error('Resend error:', data.error)
					return false
				}

				console.log(`Email sent via Resend to ${params.recipient}`)
			} else {
				// Mock mode
				console.log(`[MOCK EMAIL] To: ${params.recipient} | Subject: ${subject}`)
				console.log(html)
			}

			return true
		} catch (error) {
			console.error('Failed to send email', error)
			return false
		}
	}
}
