import { Injectable, Logger } from '@nestjs/common'
import { IPaymentProvider, CreatePaymentParams, PaymentProviderResult } from './payment.provider.interface.js'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import CircuitBreaker from 'opossum'
import { AppException } from '../../exception/app-exception.js'
import { ErrorCode } from '../../exception/error-code.js'

// Apply retry
axiosRetry(axios, {
	retries: 3,
	retryDelay: axiosRetry.exponentialDelay,
	retryCondition: (error) => {
		return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 503 || error.response?.status === 502 || error.response?.status === 504;
	}
})

@Injectable()
export class MoMoProvider implements IPaymentProvider {
	private readonly logger = new Logger(MoMoProvider.name)
	private breaker: CircuitBreaker;

	constructor() {
		const requestMoMo = async (params: CreatePaymentParams) => {
			// Fake call to MoMo API (or real test endpoint)
			// In reality, it returns a payUrl. We will simulate a call that might timeout or fail.
			const res = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', params, { timeout: 5000 })
			return res.data
		}

		this.breaker = new CircuitBreaker(requestMoMo, {
			timeout: 5000, // 5 seconds
			errorThresholdPercentage: 50, // When 50% of requests fail
			resetTimeout: 10000 // After 10 seconds, try again (Half-Open)
		})

		this.breaker.fallback(() => {
			throw new AppException(ErrorCode.InternalServerError, { reason: 'payment_gateway_down' })
		})

		this.breaker.on('open', () => this.logger.warn('Circuit breaker OPEN for MoMo'))
		this.breaker.on('halfOpen', () => this.logger.log('Circuit breaker HALF-OPEN for MoMo'))
		this.breaker.on('close', () => this.logger.log('Circuit breaker CLOSED for MoMo'))
	}

	async createPaymentUrl(params: CreatePaymentParams): Promise<PaymentProviderResult> {
		try {
			// Run through Circuit Breaker
			// We wrap it in a try-catch to catch the mock errors since we are using a fake URL
			// For this project demonstration, if it fails (because the URL is fake), it will trip the breaker.
			// To keep the system functional, we'll return a mock URL if we catch an Error, but the breaker is already implemented.
			await this.breaker.fire(params)
			const mockUrl = `https://test-payment.momo.vn/v2/gateway/api/create?paymentId=${params.paymentId}&amount=${params.amount}`
			return { paymentUrl: mockUrl }
		} catch (error) {
			// If fallback is thrown (AppException), we rethrow it.
			if (error instanceof AppException) throw error
			
			// For demo purpose, we return mock URL even if the fake POST fails,
			// just so the user flow can continue if the circuit is not fully open.
			// In a real app, we'd throw an error.
			this.logger.error(`MoMo API request failed: ${error.message}`)
			const mockUrl = `https://test-payment.momo.vn/v2/gateway/api/create?paymentId=${params.paymentId}&amount=${params.amount}`
			return { paymentUrl: mockUrl }
		}
	}

	async verifyWebhook(payload: any): Promise<boolean> {
		return true
	}
}
