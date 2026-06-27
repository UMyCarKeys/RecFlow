import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error: e2 } = await signUp(email, password, username)
    if (e2) { setError(e2.message); setLoading(false); return }
    navigate('/')
  }

  return (
    <div id="register-page" className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div id="register-container" className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1 text-center">RecFlow</h1>
        <p className="text-muted text-sm text-center mb-8">Collaborative album versioning</p>

        <div id="register-card" className="bg-surface-2 border border-white/8 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Create account</h2>
          <form id="register-form" onSubmit={handleSubmit} className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="Username"
              required
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              required
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            {error && <p id="register-error" className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-xs text-muted text-center">
            Have an account?{' '}
            <Link to="/login" className="text-accent-hover hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
