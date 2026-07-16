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
    <div className="screen" style={{ background: '#fff', padding: '28px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      {/* Compact Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🍳</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0, marginBottom: '4px' }}>
          {isSignUp ? 'Create Account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          {isSignUp ? 'Join recipHub to start cooking smarter' : 'Sign in to your account'}
        </p>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', gap: 0 }}>
        <button
          onClick={() => setIsSignUp(false)}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'none',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: isSignUp ? '#cbd5e1' : '#6ba356',
            borderBottom: isSignUp ? 'none' : '2px solid #6ba356',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'none',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: !isSignUp ? '#cbd5e1' : '#6ba356',
            borderBottom: !isSignUp ? 'none' : '2px solid #6ba356',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', color: '#991b1b', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', flex: 1 }}>
        {isSignUp && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '11px 12px',
              fontSize: '14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#f8fafc',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '11px 12px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f8fafc',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '11px 12px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f8fafc',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
        />

        {!isSignUp && (
          <div style={{ textAlign: 'right', marginTop: '-4px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#6ba356',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: 0
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
            padding: '12px 16px',
            background: '#6ba356',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            marginTop: '4px'
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#5a9549')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#6ba356')}
        >
          {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '500' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      {/* OAuth Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          style={{
            flex: 1,
            padding: '11px 12px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
        >
          Google
        </button>
        <button
          style={{
            flex: 1,
            padding: '11px 12px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
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
