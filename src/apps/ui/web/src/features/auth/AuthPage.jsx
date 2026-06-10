import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { useAuthStore } from '../../shared/stores/authStore'

export function AuthPage() {
	const [email, setEmail] = useState('audience@ticketbox.local')
	const [password, setPassword] = useState('password123')
	const [error, setError] = useState(null)
	const [isLoggingIn, setIsLoggingIn] = useState(false)
	const login = useAuthStore((state) => state.login)
	const status = useAuthStore((state) => state.status)
	const navigate = useNavigate()

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError(null)
		setIsLoggingIn(true)
		try {
			await login(email, password)
			navigate('/')
		} catch (loginError) {
			setError(loginError.message ?? 'Đăng nhập thất bại.')
		} finally {
			setIsLoggingIn(false)
		}
	}

	const [registerName, setRegisterName] = useState('')
	const [registerEmail, setRegisterEmail] = useState('')
	const [registerPassword, setRegisterPassword] = useState('')
	const [registerError, setRegisterError] = useState(null)
	const [isRegistering, setIsRegistering] = useState(false)
	const register = useAuthStore((state) => state.register)

	const handleRegister = async (event) => {
		event.preventDefault()
		setRegisterError(null)
		setIsRegistering(true)
		try {
			await register(registerName, registerEmail, registerPassword)
			navigate('/')
		} catch (err) {
			setRegisterError(err.message ?? 'Đăng ký thất bại.')
		} finally {
			setIsRegistering(false)
		}
	}

	return (
		<div className="relative min-h-[80vh] flex items-center justify-center">
			{/* Ambient Glows */}
			<div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_20%,_transparent)] blur-[120px] pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_15%,_transparent)] blur-[120px] pointer-events-none" />

			<div className="relative z-10 w-full grid gap-8 lg:grid-cols-2 lg:gap-12 animate-fade-in-up">
				{/* Login Form */}
				<div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 lg:p-10 shadow-2xl transition-all duration-500 hover:border-white/20">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.05),_transparent_50%)] pointer-events-none" />
					<div className="relative z-10">
						<h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Đăng nhập</h1>
						<p className="mt-3 text-sm text-gray-400 font-medium">
							Quản lý ví vé, lưu tùy chọn và theo dõi lịch sử giao dịch.
						</p>
						<form className="mt-8 space-y-5" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Email</label>
								<Input
									className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all"
									placeholder="Nhập email của bạn"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									autoComplete="email"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Mật khẩu</label>
								<Input
									className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all"
									placeholder="Nhập mật khẩu"
									type="password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									autoComplete="current-password"
								/>
							</div>
							{error ? (
								<div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
									{error}
								</div>
							) : null}
							<button 
								className="w-full rounded-full px-6 py-4 text-sm font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2" 
								type="submit" 
								disabled={isLoggingIn || status === 'loading'}
							>
								{isLoggingIn ? 'Đang xử lý...' : 'Đăng nhập'}
							</button>
						</form>
						<div className="mt-8 space-y-4">
							<div className="relative flex items-center py-2">
								<div className="flex-grow border-t border-white/10"></div>
								<span className="mx-4 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-widest">Hoặc</span>
								<div className="flex-grow border-t border-white/10"></div>
							</div>
							<button className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm active:scale-95">
								Tiếp tục với Google
							</button>
							<button className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm active:scale-95">
								Tiếp tục với Apple
							</button>
						</div>
					</div>
				</div>

				{/* Register Form */}
				<div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 lg:p-10 shadow-2xl transition-all duration-500 hover:border-white/20">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.05),_transparent_50%)] pointer-events-none" />
					<div className="relative z-10 flex flex-col h-full">
						<h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Tạo tài khoản</h2>
						<p className="mt-3 text-sm text-gray-400 font-medium">
							Tham gia TicketBox để sẵn sàng săn vé nhanh chóng nhất.
						</p>
						<form className="mt-8 space-y-5 flex-1" onSubmit={handleRegister}>
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Họ và tên</label>
								<Input 
									className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all"
									placeholder="Nhập họ tên đầy đủ" 
									value={registerName}
									onChange={(e) => setRegisterName(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Email</label>
								<Input 
									className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all"
									placeholder="Nhập email của bạn" 
									type="email"
									value={registerEmail}
									onChange={(e) => setRegisterEmail(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Mật khẩu</label>
								<Input 
									className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all"
									placeholder="Tạo mật khẩu (ít nhất 8 ký tự)" 
									type="password" 
									value={registerPassword}
									onChange={(e) => setRegisterPassword(e.target.value)}
									required
									minLength={8}
								/>
							</div>
							{registerError ? (
								<div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
									{registerError}
								</div>
							) : null}
							<button 
								className="w-full rounded-full bg-white/10 border border-white/20 px-6 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-4" 
								type="submit" 
								disabled={isRegistering || status === 'loading'}
							>
								{isRegistering ? 'Đang tạo...' : 'Đăng ký ngay'}
							</button>
						</form>
						<div className="mt-8 pt-6 border-t border-white/10">
							<p className="text-[11px] text-gray-500 leading-relaxed text-center">
								Bằng việc tạo tài khoản, bạn đồng ý với các Điều khoản và Chính sách phân phối vé của TicketBox. Hệ thống áp dụng công nghệ chống gian lận trong các sự kiện có độ nóng cao.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
