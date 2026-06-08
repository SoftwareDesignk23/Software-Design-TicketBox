import { Injectable } from '@nestjs/common'
import { IPaymentProvider, CreatePaymentParams, PaymentProviderResult } from './payment.provider.interface.js'

@Injectable()
export class MoMoProvider implements IPaymentProvider {
	async createPaymentUrl(params: CreatePaymentParams): Promise<PaymentProviderResult> {
		// Mock MoMo provider
		const mockUrl = `https://test-payment.momo.vn/v2/gateway/api/create?paymentId=${params.paymentId}&amount=${params.amount}`
		return { paymentUrl: mockUrl }
	}

	async verifyWebhook(payload: any): Promise<boolean> {
		// Abstract implementation
		return true
	}
}
