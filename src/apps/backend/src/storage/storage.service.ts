import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import CircuitBreaker from 'opossum'
import * as crypto from 'crypto'

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name);
	private readonly uploaderBreaker: CircuitBreaker;
	private readonly axiosInstance = axios.create({ timeout: 15000 });

	constructor() {
		// Configure Axios Retry (Exponential backoff, 3 retries max)
		axiosRetry(this.axiosInstance, {
			retries: 3,
			retryDelay: axiosRetry.exponentialDelay,
			retryCondition: (error: any) => {
				// Retry on network errors or 5xx status codes
				return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response?.status ? error.response.status >= 500 : false);
			}
		});

		// Configure Opossum Circuit Breaker
		const breakerOptions = {
			timeout: 20000, // If function takes longer than 20 seconds, trigger failure
			errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
			resetTimeout: 30000 // After 30s, try again
		};

		this.uploaderBreaker = new CircuitBreaker(this.executeUpload.bind(this), breakerOptions);

		this.uploaderBreaker.fallback(() => {
			this.logger.error('Circuit Breaker is OPEN! Rejecting upload to protect system.');
			throw new InternalServerErrorException('Hệ thống lưu trữ đang quá tải, vui lòng thử lại sau.');
		});

		this.uploaderBreaker.on('open', () => this.logger.warn('Cloudinary Circuit Breaker tripped (OPEN)'));
		this.uploaderBreaker.on('halfOpen', () => this.logger.log('Cloudinary Circuit Breaker probing (HALF-OPEN)'));
		this.uploaderBreaker.on('close', () => this.logger.log('Cloudinary Circuit Breaker recovered (CLOSED)'));
	}

	private async executeUpload(fileBuffer: Buffer, contentType: string): Promise<string> {
		const apiSecret = process.env.API_SECRET_OBJECT_STORAGE
		const apiKey = process.env.API_KEY_OBJECT_STORAGE
		const cloudName = process.env.CLOUD_NAME_OBJECT_STORAGE

		if (!apiSecret || !apiKey || !cloudName) {
			throw new InternalServerErrorException('Cloudinary configuration is missing');
		}

		const timestamp = Math.round(new Date().getTime() / 1000)
		const folder = 'ticketbox'
		const str = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
		const signature = crypto.createHash('sha1').update(str).digest('hex')

		// Convert buffer to Data URI
		const fileBase64 = fileBuffer.toString('base64');
		const fileDataUri = `data:${contentType};base64,${fileBase64}`;

		const formData = new URLSearchParams();
		formData.append('api_key', apiKey);
		formData.append('timestamp', timestamp.toString());
		formData.append('folder', folder);
		formData.append('signature', signature);
		formData.append('file', fileDataUri);

		const response = await this.axiosInstance.post(
			`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
			formData,
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}
		);

		return response.data.secure_url;
	}

	/**
	 * Proxy upload through backend.
	 * Uses Circuit Breaker and Retry for high availability.
	 */
	async uploadFile(fileBuffer: Buffer, contentType: string): Promise<string> {
		try {
			// Fire the circuit breaker wrapper
			return await this.uploaderBreaker.fire(fileBuffer, contentType) as string;
		} catch (error: any) {
			this.logger.error(`Upload proxy failed: ${error.message}`);
			throw new InternalServerErrorException(error.message || 'Lỗi khi upload file');
		}
	}

	/**
	 * Legacy support if needed for backend scripts passing local file path.
	 */
	async uploadLocalFile(filePath: string, contentType: string): Promise<string> {
		const fs = await import('fs');
		const buffer = fs.readFileSync(filePath);
		const url = await this.uploadFile(buffer, contentType);
		fs.unlinkSync(filePath); // auto cleanup
		return url;
	}
}

