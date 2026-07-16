import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, name: string, password: string) => Promise<void>
  onNavigate: (screen: Screen) => void
}

export default function SignInScreen({ onSignIn, onSignUp }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await onSignUp(email, name, password)
      } else {
        await onSignIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ background: '#fff', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📖</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0, marginBottom: '6px', wordBreak: 'break-word' }}>
          {isSignUp ? 'Create Account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, wordBreak: 'break-word' }}>
          {isSignUp ? 'Join recipHub to start cooking smarter' : 'Sign in to your recipHub'}
        </p>
      </div>

      {/* Pill Tab Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <button
          onClick={() => setIsSignUp(false)}
          style={{
            padding: '10px 24px',
            background: !isSignUp ? '#f1f5f9' : '#fff',
            border: `1px solid ${!isSignUp ? '#e2e8f0' : '#e2e8f0'}`,
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            color: !isSignUp ? '#1e293b' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          style={{
            padding: '10px 24px',
            background: isSignUp ? '#f1f5f9' : '#fff',
            border: `1px solid ${isSignUp ? '#e2e8f0' : '#e2e8f0'}`,
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            color: isSignUp ? '#1e293b' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#991b1b', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
        {isSignUp && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#f8fafc',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Email</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Mail size={18} style={{ position: 'absolute', left: '12px', color: '#cbd5e1', pointerEvents: 'none' }} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#f8fafc',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', color: '#cbd5e1', pointerEvents: 'none' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#f8fafc',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {!isSignUp && (
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#6ba356',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '14px 16px',
            background: '#6ba356',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.3s ease',
            marginTop: '8px'
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#5a9549')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#6ba356')}
        >
          {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      {/* OAuth Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
        >
          Google
        </button>
        <button
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
        >
          Apple
        </button>
      </div>
    </div>
  )
}
