import { Routes, Route } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { AuthShell } from './layouts/AuthShell'
import { LandingPage } from '../features/landing/LandingPage'
import { EventListPage } from '../features/events/EventListPage'
import { EventDetailPage } from '../features/events/EventDetailPage'
import { SeatSelectionPage } from '../features/checkout/SeatSelectionPage'
import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { PaymentCallbackPage } from '../features/checkout/PaymentCallbackPage'
import { MyTicketsPage } from '../features/tickets/MyTicketsPage'
import { BookingHistoryPage } from '../features/tickets/BookingHistoryPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { AuthPage } from '../features/auth/AuthPage'
import { NotFoundPage } from '../features/misc/NotFoundPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route index element={<LandingPage />} />
				<Route path="/events" element={<EventListPage />} />
				<Route path="/events/:eventId" element={<EventDetailPage />} />
				<Route path="/events/:eventId/seats" element={<SeatSelectionPage />} />
				<Route path="/checkout" element={<CheckoutPage />} />
				<Route path="/payment/return" element={<PaymentCallbackPage />} />
				<Route element={<ProtectedRoute />}>
					<Route path="/tickets" element={<MyTicketsPage />} />
					<Route path="/history" element={<BookingHistoryPage />} />
					<Route path="/profile" element={<ProfilePage />} />
				</Route>
			</Route>
			<Route element={<AuthShell />}>
				<Route path="/auth" element={<AuthPage />} />
			</Route>
			<Route path="*" element={<NotFoundPage />} />
		</Routes>
	)
}
