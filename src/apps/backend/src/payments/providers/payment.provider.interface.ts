export interface CreatePaymentParams {
	paymentId: string
	amount: number
	currency: string
	returnUrl: string
}

export interface PaymentProviderResult {
	paymentUrl: string
}

export interface IPaymentProvider {
	createPaymentUrl(params: CreatePaymentParams): Promise<PaymentProviderResult>
	verifyWebhook(payload: any): Promise<boolean>
}
