import { useState } from 'react'
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
    <div className="screen" style={{ background: '#fff', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍳</div>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0, marginBottom: '8px' }}>
          {isSignUp ? 'Create Account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          {isSignUp ? 'Join recipHub to start cooking smarter' : 'Sign in to your RECIPhub'}
        </p>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setIsSignUp(false)}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            color: isSignUp ? '#94a3b8' : '#6ba356',
            borderBottom: isSignUp ? 'none' : '3px solid #6ba356',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            color: !isSignUp ? '#94a3b8' : '#6ba356',
            borderBottom: !isSignUp ? 'none' : '3px solid #6ba356',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee', border: '1px solid #fca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {isSignUp && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Name</label>
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
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
