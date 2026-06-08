import { Injectable, Logger } from '@nestjs/common'
import { IPaymentProvider, CreatePaymentParams, PaymentProviderResult } from './payment.provider.interface.js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import moment from 'moment'
import qs from 'qs'
import { AppException } from '../../exception/app-exception.js'
import { ErrorCode } from '../../exception/error-code.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

@Injectable()
export class VNPayProvider implements IPaymentProvider {
	private readonly logger = new Logger(VNPayProvider.name)
	private config: any

	constructor() {
		// Because tsc does not copy .json files to dist by default, we resolve from src or process.cwd()
		const configPath = path.join(process.cwd(), 'src/payments/config/vnpay.json')
		try {
			if (fs.existsSync(configPath)) {
				const raw = fs.readFileSync(configPath, 'utf8')
				this.config = JSON.parse(raw)
			} else {
				// Fallback if running directly from the file location
				const fallbackPath = path.join(__dirname, '../config/vnpay.json')
				if (fs.existsSync(fallbackPath)) {
					const raw = fs.readFileSync(fallbackPath, 'utf8')
					this.config = JSON.parse(raw)
				}
			}
		} catch (e) {
			this.logger.error('Failed to load vnpay.json config', e)
		}
	}

	private sortObject(obj: any) {
		let sorted: any = {}
		let str: string[] = []
		let key
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				str.push(encodeURIComponent(key))
			}
		}
		str.sort()
		for (key = 0; key < str.length; key++) {
			sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+')
		}
		return sorted
	}

	async createPaymentUrl(params: CreatePaymentParams): Promise<PaymentProviderResult> {
		if (!this.config) {
			throw new AppException(ErrorCode.InternalServerError, { reason: 'vnpay_config_missing' })
		}

		process.env.TZ = 'Asia/Ho_Chi_Minh'
		const date = new Date()
		const createDate = moment(date).format('YYYYMMDDHHmmss')

		const tmnCode = this.config.vnp_TmnCode
		const secretKey = this.config.vnp_HashSecret
		let vnpUrl = this.config.vnp_Url
		const returnUrl = this.config.vnp_ReturnUrl

		const orderId = params.paymentId // Using our UUID payment ID
		const amount = params.amount
		const bankCode = '' // Optional

		let locale = 'vn'
		let currCode = params.currency || 'VND'

		let vnp_Params: any = {}
		vnp_Params['vnp_Version'] = '2.1.0'
		vnp_Params['vnp_Command'] = 'pay'
		vnp_Params['vnp_TmnCode'] = tmnCode
		vnp_Params['vnp_Locale'] = locale
		vnp_Params['vnp_CurrCode'] = currCode
		vnp_Params['vnp_TxnRef'] = orderId
		vnp_Params['vnp_OrderInfo'] = 'Thanh toan ve TicketBox cho GD: ' + orderId
		vnp_Params['vnp_OrderType'] = 'other'
		vnp_Params['vnp_Amount'] = amount * 100
		vnp_Params['vnp_ReturnUrl'] = params.returnUrl || returnUrl
		vnp_Params['vnp_IpAddr'] = '127.0.0.1' // Typically you would extract this from req, but for backend provider it's fine to mock or pass via params
		vnp_Params['vnp_CreateDate'] = createDate

		if (bankCode !== null && bankCode !== '') {
			vnp_Params['vnp_BankCode'] = bankCode
		}

		vnp_Params = this.sortObject(vnp_Params)

		const signData = qs.stringify(vnp_Params, { encode: false })
		const hmac = crypto.createHmac('sha512', secretKey)
		const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')
		vnp_Params['vnp_SecureHash'] = signed

		vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false })

		return { paymentUrl: vnpUrl }
	}

	async verifyWebhook(payload: any): Promise<boolean> {
		if (!this.config) return false

		const secretKey = this.config.vnp_HashSecret
		let vnp_Params = { ...payload }

		const secureHash = vnp_Params['vnp_SecureHash']

		delete vnp_Params['vnp_SecureHash']
		delete vnp_Params['vnp_SecureHashType']

		vnp_Params = this.sortObject(vnp_Params)

		const signData = qs.stringify(vnp_Params, { encode: false })
		const hmac = crypto.createHmac('sha512', secretKey)
		const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

		if (secureHash === signed) {
			// Check if response code indicates success
			return vnp_Params['vnp_ResponseCode'] === '00'
		}

		return false
	}
}
