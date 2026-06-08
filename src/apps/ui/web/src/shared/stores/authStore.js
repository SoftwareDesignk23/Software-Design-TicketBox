import { create } from 'zustand'
import {
	clearStoredTokens,
	getCurrentUser,
	loadStoredTokens,
	login as loginRequest,
	register as registerRequest,
	logout as logoutRequest,
	refreshSession,
} from '../services/auth'

let restorePromise = null;

export const useAuthStore = create((set) => ({
	status: 'idle',
	user: null,
	accessToken: null,
	refreshToken: null,
	error: null,
	restoreSession: async () => {
		if (restorePromise) return restorePromise;
		
		restorePromise = (async () => {
			const tokens = loadStoredTokens()

			if (!tokens?.refreshToken) {
				set({ status: 'unauthenticated', user: null, accessToken: null, refreshToken: null })
				return
			}

			set({ status: 'loading', error: null })

			try {
				const refreshed = await refreshSession(tokens.refreshToken)
				
				set({
					status: 'authenticated',
					user: refreshed.user,
					accessToken: refreshed.accessToken,
					refreshToken: refreshed.refreshToken,
				})
			} catch (error) {
				console.error('Failed to restore session:', error)
				clearStoredTokens()
				set({ status: 'unauthenticated', user: null, error })
			}
		})();
		
		try {
			await restorePromise;
		} finally {
			restorePromise = null;
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
	register: async (displayName, email, password) => {
		set({ status: 'loading', error: null })
		try {
			const response = await registerRequest(displayName, email, password)
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
