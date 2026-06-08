const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const TOKEN_KEY = 'ticketbox.auth.tokens'

let memoryAccessToken = null

export function getAccessToken() {
	return memoryAccessToken
}

export function setAccessToken(token) {
	memoryAccessToken = token
}

function getStoredRefreshToken() {
	const raw = localStorage.getItem(TOKEN_KEY)
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw)
		if (parsed && parsed.refreshToken) {
			localStorage.setItem(TOKEN_KEY, parsed.refreshToken)
			return parsed.refreshToken
		}
		return raw
	} catch {
		return raw
	}
}

function saveRefreshToken(token) {
	if (token) {
		localStorage.setItem(TOKEN_KEY, token)
	} else {
		localStorage.removeItem(TOKEN_KEY)
	}
}

function clearTokens() {
	memoryAccessToken = null
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

	const payload = await response.json()
	return payload.data ?? payload
}

export async function login(email, password) {
	const result = await request('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	setAccessToken(result.accessToken)
	saveRefreshToken(result.refreshToken)

	return result
}

export async function register(displayName, email, password) {
	const result = await request('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ displayName, email, password }),
	})

	setAccessToken(result.accessToken)
	saveRefreshToken(result.refreshToken)

	return result
}

let refreshPromise = null

export async function refreshSession(refreshToken) {
	if (refreshPromise) return refreshPromise
	
	refreshPromise = (async () => {
		try {
			const result = await request('/auth/refresh', {
				method: 'POST',
				body: JSON.stringify({ refreshToken }),
			})

			setAccessToken(result.accessToken)
			saveRefreshToken(result.refreshToken)

			return result
		} finally {
			refreshPromise = null
		}
	})()
	
	return refreshPromise
}

export async function logout(refreshToken) {
	try {
		await request('/auth/logout', {
			method: 'POST',
			body: JSON.stringify({ refreshToken }),
		})
	} finally {
		clearTokens()
	}
}

export async function getCurrentUser(accessToken) {
	return request('/auth/me', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
}

export function loadStoredTokens() {
	// For backward compatibility or if needed, we just return the refresh token structure
	return { refreshToken: getStoredRefreshToken() }
}

export function clearStoredTokens() {
	clearTokens()
}
