import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../shared/stores/authStore'

export function ProtectedRoute() {
	const location = useLocation()
	const status = useAuthStore((state) => state.status)

	if (status === 'loading' || status === 'idle') {
		return (
			<div className="rounded-3xl border border-subtle bg-surface-1 p-6 text-sm text-muted">
				Restoring your session...
			</div>
		)
	}

	if (status === 'forbidden') {
		return (
			<div className="rounded-3xl border border-subtle bg-surface-1 p-6 text-sm text-muted">
				You do not have access to this page.
			</div>
		)
	}

	if (status !== 'authenticated') {
		return <Navigate to="/auth" replace state={{ from: location }} />
	}

	return <Outlet />
}
