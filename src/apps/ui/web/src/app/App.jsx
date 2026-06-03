import { useEffect } from 'react'
import { AppRoutes } from './routes'
import { ScrollToTop } from './ScrollToTop'
import { useAuthStore } from '../shared/stores/authStore'

export default function App() {
	const restoreSession = useAuthStore((state) => state.restoreSession)

	useEffect(() => {
		restoreSession()
	}, [restoreSession])

	return (
		<>
			<ScrollToTop />
			<AppRoutes />
		</>
	)
}
