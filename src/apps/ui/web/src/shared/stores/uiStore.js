import { create } from 'zustand'

export const useUiStore = create((set) => ({
	isSearchOpen: false,
	isNotificationsOpen: false,
	openSearch: () =>
		set({
			isSearchOpen: true,
			isNotificationsOpen: false,
		}),
	closeSearch: () => set({ isSearchOpen: false }),
	toggleSearch: () =>
		set((state) => ({
			isSearchOpen: !state.isSearchOpen,
			isNotificationsOpen: false,
		})),
	toggleNotifications: () =>
		set((state) => ({
			isNotificationsOpen: !state.isNotificationsOpen,
			isSearchOpen: false,
		})),
	closeNotifications: () => set({ isNotificationsOpen: false }),
}))
