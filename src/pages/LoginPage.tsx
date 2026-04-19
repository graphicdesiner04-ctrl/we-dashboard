// ── WE Technical Support Dashboard — Login Page ──────────────────────────
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (isAuthenticated) return <Navigate to="/overview" replace />

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    // Small delay for UX — replace with real async call when backend is ready
    setTimeout(() => {
      const ok = login(username, password)
      if (!ok) setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      setLoading(false)
    }, 280)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#070F20 0%,#0D1B38 60%,#0a0a1a 100%)' }}
      dir="rtl"
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6B21A8 0%,#4C1D95 100%)' }}
          >
            WE
          </div>
          <div>
            <h1 className="text-white font-black text-lg leading-tight">
              WE Technical Support
            </h1>
            <p className="text-sm font-semibold mt-0.5" style={{ color: '#C084FC' }}>
              Dashboard
            </p>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            سجّل الدخول للمتابعة
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="Ahmed.H.Bahaa"
              autoComplete="username"
              dir="ltr"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = '#6B21A8')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••••"
                autoComplete="current-password"
                dir="ltr"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontFamily: 'inherit',
                  paddingLeft: '2.75rem',
                }}
                onFocus={e => (e.target.style.borderColor = '#6B21A8')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"
              style={{ background: 'rgba(220,38,38,0.12)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.25)' }}
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'جاري الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            WE Egypt — نظام الدعم الفني
          </p>
          <p className="text-center text-[10px] font-semibold" style={{ color: 'rgba(192,132,252,0.45)' }}>
            تم التصميم بواسطة م.أحمد حسن بهاء
          </p>
        </div>
      </div>
    </div>
  )
}
