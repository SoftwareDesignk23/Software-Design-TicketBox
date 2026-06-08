import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class StorageService {
	private readonly s3Client: S3Client
	private readonly bucket = process.env.BUCKET_NAME

	constructor() {
		const endpoint = process.env.ENDPOINT_B2
		const accessKeyId = process.env.KEYID_B2
		const secretAccessKey = process.env.APPLICATIONKEY_B2

		if (!endpoint || !accessKeyId || !secretAccessKey) {
			console.warn('Storage configuration missing. Using mock storage.')
			this.s3Client = new S3Client({ region: 'us-east-1' })
		} else {
			this.s3Client = new S3Client({
				endpoint: `https://${endpoint}`,
				region: 'us-east-005',
				credentials: {
					accessKeyId,
					secretAccessKey,
				},
			})
		}
	}

	async generatePresignedUrl(
		fileExtension: string,
		contentType: string,
	): Promise<{ uploadUrl: string; fileUrl: string }> {
		const fileKey = `${uuidv4()}.${fileExtension}`

		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: fileKey,
			ContentType: contentType,
		})

		try {
			// Gen URL valid for 15 minutes
			const uploadUrl = await getSignedUrl(this.s3Client, command, {
				expiresIn: process.env.PRESIGNED_URL_EXPIRATION_SECONDS
					? parseInt(process.env.PRESIGNED_URL_EXPIRATION_SECONDS)
					: 900,
			})

			// Compute public url (Depends on bucket visibility. If public, this works)
			const fileUrl = `https://${this.bucket}.${process.env.ENDPOINT_B2}/${fileKey}`

			return { uploadUrl, fileUrl }
		} catch (error) {
			console.error('Error generating presigned url', error)
			throw new InternalServerErrorException('Could not generate presigned url')
		}
	}
}

