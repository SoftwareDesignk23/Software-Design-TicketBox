const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const TOKEN_KEY = 'ticketbox.auth.tokens'

function getStoredTokens() {
	const raw = localStorage.getItem(TOKEN_KEY)
	if (!raw) {
		return null
	}
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}

function saveTokens(tokens) {
	localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

function clearTokens() {
	localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...(options.headers ?? {}),
		},
		...options,
	})

	if (!response.ok) {
		let payload
		try {
			payload = await response.json()
		} catch {
			payload = { message: 'Request failed.' }
		}

		const error = new Error(payload.message ?? 'Request failed.')
		error.status = response.status
		error.code = payload.code
		throw error
	}

	return response.json()
}

export async function login(email, password) {
	const result = await request('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	saveTokens({
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	})

	return result
}

export async function refreshSession(refreshToken) {
	const result = await request('/auth/refresh', {
		method: 'POST',
		body: JSON.stringify({ refreshToken }),
	})

	saveTokens({
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	})

	return result
}

export async function logout(refreshToken) {
	await request('/auth/logout', {
		method: 'POST',
		body: JSON.stringify({ refreshToken }),
	})

	clearTokens()
}

export async function getCurrentUser(accessToken) {
	return request('/auth/me', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
}

export function loadStoredTokens() {
	return getStoredTokens()
}

export function clearStoredTokens() {
	clearTokens()
}
