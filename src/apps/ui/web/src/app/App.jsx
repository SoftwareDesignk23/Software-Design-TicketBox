import { useEffect } from 'react'
import { AppRoutes } from './routes'
import { ScrollToTop } from './ScrollToTop'
import { useAuthStore } from '../shared/stores/authStore'
import { ToastProvider } from '../shared/ui/Toast'

export default function App() {
	const restoreSession = useAuthStore((state) => state.restoreSession)

	useEffect(() => {
		restoreSession()
	}, [restoreSession])

	return (
		<ToastProvider>
			<ScrollToTop />
			<AppRoutes />
		</ToastProvider>
	)
}
