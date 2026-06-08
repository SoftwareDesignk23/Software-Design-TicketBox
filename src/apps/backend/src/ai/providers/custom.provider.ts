import { Injectable, Logger } from '@nestjs/common'
import { IAiProvider } from './ai.provider.interface.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { AppException } from '../../exception/app-exception.js'
import { ErrorCode } from '../../exception/error-code.js'
import lodash from 'lodash'

const { get } = lodash
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

@Injectable()
export class CustomAiProvider implements IAiProvider {
	private readonly logger = new Logger(CustomAiProvider.name)
	private customConfig: any
	private promptConfig: any

	constructor() {
		// Load configai.json
		const configAiPath = path.join(__dirname, '../config/configai.json')
		try {
			const raw = fs.readFileSync(configAiPath, 'utf8')
			this.customConfig = JSON.parse(raw)
		} catch (e) {
			this.logger.error('Failed to load configai.json', e)
		}

		// Load prompt config
		const configPromptPath = path.join(__dirname, '../config/ai-prompt.json')
		try {
			const raw = fs.readFileSync(configPromptPath, 'utf8')
			this.promptConfig = JSON.parse(raw)
		} catch (e) {
			this.logger.error('Failed to load ai-prompt.json', e)
		}
	}

	async generateBio(inputText: string): Promise<string> {
		if (!this.customConfig) {
			throw new AppException(ErrorCode.InternalServerError, { reason: 'custom_ai_config_missing' })
		}

		const { apiUrl, method, headers, bodyTemplate, resultFieldPath } = this.customConfig

		// Deep clone body template to avoid mutating the original config
		const body = JSON.parse(JSON.stringify(bodyTemplate))

		// Stringify to replace template vars
		let bodyStr = JSON.stringify(body)
		bodyStr = bodyStr.replace(/{{systemInstruction}}/g, this.promptConfig?.systemInstruction || '')
		bodyStr = bodyStr.replace(/{{prompt}}/g, this.promptConfig?.prompt || '')
		bodyStr = bodyStr.replace(
			/{{formatRequirements}}/g,
			this.promptConfig?.formatRequirements || '',
		)

		// Escape inputText to fit in JSON
		const escapedInput = inputText.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
		bodyStr = bodyStr.replace(/{{inputText}}/g, escapedInput)

		try {
			const response = await fetch(apiUrl, {
				method: method || 'POST',
				headers: headers || { 'Content-Type': 'application/json' },
				body: bodyStr,
			})

			if (!response.ok) {
				const errorText = await response.text()
				this.logger.error(`Custom AI Provider failed with status ${response.status}`, errorText)
				throw new Error(`Custom AI request failed: ${response.statusText}`)
			}

			const data = await response.json()

			// Extract field using lodash.get
			const result = get(data, resultFieldPath)
			if (typeof result !== 'string') {
				this.logger.error(`Result field '${resultFieldPath}' not found or is not a string`, data)
				throw new Error(`Invalid response format from Custom AI`)
			}

			return result
		} catch (error) {
			this.logger.error('CustomAiProvider generateBio error', error)
			throw new AppException(ErrorCode.InternalServerError, { reason: 'custom_ai_failed' })
		}
	}
}

