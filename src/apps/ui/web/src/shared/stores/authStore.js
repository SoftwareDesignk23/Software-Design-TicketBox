import { create } from 'zustand'
import {
	clearStoredTokens,
	getCurrentUser,
	loadStoredTokens,
	login as loginRequest,
	logout as logoutRequest,
	refreshSession,
} from '../services/auth'

export const useAuthStore = create((set) => ({
	status: 'idle',
	user: null,
	accessToken: null,
	refreshToken: null,
	error: null,
	restoreSession: async () => {
		const tokens = loadStoredTokens()

		if (!tokens?.accessToken) {
			set({ status: 'unauthenticated', user: null, accessToken: null, refreshToken: null })
			return
		}

		set({ status: 'loading', error: null })

		try {
			const currentUser = await getCurrentUser(tokens.accessToken)
			set({
				status: 'authenticated',
				user: currentUser,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
			})
		} catch (error) {
			if (error.status === 401 && tokens.refreshToken) {
				try {
					const refreshed = await refreshSession(tokens.refreshToken)
					set({
						status: 'authenticated',
						user: refreshed.user,
						accessToken: refreshed.accessToken,
						refreshToken: refreshed.refreshToken,
					})
					return
				} catch (refreshError) {
					clearStoredTokens()
					set({ status: 'unauthenticated', user: null, error: refreshError })
					return
				}
			}

			if (error.status === 403) {
				set({ status: 'forbidden', user: null, error })
				return
			}

			clearStoredTokens()
			set({ status: 'unauthenticated', user: null, error })
		}
	},
	login: async (email, password) => {
		set({ status: 'loading', error: null })
		try {
			const response = await loginRequest(email, password)
			set({
				status: 'authenticated',
				user: response.user,
				accessToken: response.accessToken,
				refreshToken: response.refreshToken,
			})
		} catch (error) {
			set({ status: 'unauthenticated', user: null, error })
			throw error
		}
	},
	logout: async () => {
		set({ status: 'loading' })
		try {
			const tokens = loadStoredTokens()
			if (tokens?.refreshToken) {
				await logoutRequest(tokens.refreshToken)
			}
		} finally {
			clearStoredTokens()
			set({ status: 'unauthenticated', user: null, accessToken: null, refreshToken: null })
		}
	},
}))
