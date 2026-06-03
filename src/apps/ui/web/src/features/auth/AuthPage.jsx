import { useState } from 'react'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { useAuthStore } from '../../shared/stores/authStore'

export function AuthPage() {
	const [email, setEmail] = useState('audience@ticketbox.local')
	const [password, setPassword] = useState('password123')
	const [error, setError] = useState(null)
	const login = useAuthStore((state) => state.login)
	const status = useAuthStore((state) => state.status)

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError(null)
		try {
			await login(email, password)
		} catch (loginError) {
			setError(loginError.message ?? 'Unable to sign in.')
		}
	}

	return (
		<div className="grid gap-8 lg:grid-cols-2">
			<div className="rounded-[32px] border border-subtle bg-surface-1 p-8">
				<h1 className="text-2xl font-semibold text-primary">Sign in</h1>
				<p className="mt-2 text-sm text-muted">
					Access your drops, tickets, and saved seat preferences.
				</p>
				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<Input
						placeholder="Email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						autoComplete="email"
					/>
					<Input
						placeholder="Password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
					/>
					{error ? (
						<p className="rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-xs text-muted">
							{error}
						</p>
					) : null}
					<Button size="lg" className="w-full" type="submit" disabled={status === 'loading'}>
						{status === 'loading' ? 'Signing in...' : 'Sign in'}
					</Button>
				</form>
				<div className="mt-6 space-y-3">
					<button className="w-full rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-muted hover:bg-surface-3">
						Continue with Google
					</button>
					<button className="w-full rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-muted hover:bg-surface-3">
						Continue with Apple
					</button>
				</div>
				<div className="mt-6 rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-xs text-muted">
					Secure sessions with device verification on every high-demand drop.
				</div>
			</div>

			<div className="rounded-[32px] border border-subtle bg-surface-1 p-8">
				<h2 className="text-2xl font-semibold text-primary">Create account</h2>
				<p className="mt-2 text-sm text-muted">
					Get ready for the next stadium drop with faster checkout.
				</p>
				<div className="mt-6 space-y-4">
					<Input placeholder="Full name" />
					<Input placeholder="Email" />
					<Input placeholder="Phone number" />
					<Input placeholder="Password" type="password" />
					<Button variant="secondary" size="lg" className="w-full">
						Create account
					</Button>
				</div>
				<p className="mt-6 text-xs text-soft">
					By creating an account you agree to the TicketBox terms and ticketing policies.
				</p>
			</div>
		</div>
	)
}
