import { useState } from 'react'
import { ChevronLeft, MailCheck, Lock } from 'lucide-react'
import type { Screen } from '../types'
import { authAPI } from '../utils/api'

const GREEN = '#6ba356'

interface Props {
  /** 'request' asks for the email; 'reset' is where the emailed link lands. */
  mode: 'request' | 'reset'
  token?: string
  onNavigate: (screen: Screen, data?: any) => void
}

export default function PasswordResetScreen({ mode, token, onNavigate }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)

  const request = async () => {
    setError('')
    setBusy(true)
    try {
      await authAPI.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that just now')
    } finally {
      setBusy(false)
    }
  }

  const submitNew = async () => {
    setError('')
    if (password.length < 8) return setError('Choose a password of at least 8 characters')
    if (password !== confirm) return setError('Those two passwords do not match')
    setBusy(true)
    try {
      await authAPI.resetPassword(token!, password)
      // Spent — don't leave it able to reopen this screen.
      sessionStorage.removeItem('pendingReset')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset that')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen" style={{ background: 'var(--color-card)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', flexShrink: 0 }}>
        <button onClick={() => { sessionStorage.removeItem('pendingReset'); onNavigate('signin') }} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={22} color="var(--color-text)" />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
          {mode === 'request' ? 'Forgot password' : 'Choose a new password'}
        </h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {/* ── asked for a link, and it has gone ── */}
        {mode === 'request' && sent ? (
          <div style={{ textAlign: 'center', paddingTop: '28px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MailCheck size={26} color={GREEN} />
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px' }}>Check your inbox</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              If <strong style={{ color: 'var(--color-text)' }}>{email}</strong> has an account, a
              reset link is on its way. It works once and expires in an hour.
            </p>
            <button onClick={() => onNavigate('signin')} style={primaryBtn(false)}>Back to sign in</button>
          </div>
        ) : mode === 'reset' && done ? (
          <div style={{ textAlign: 'center', paddingTop: '28px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={24} color={GREEN} />
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px' }}>Password changed</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              You can sign in with it now.
            </p>
            <button onClick={() => onNavigate('signin')} style={primaryBtn(false)}>Sign in</button>
          </div>
        ) : mode === 'request' ? (
          <>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '10px 0 18px' }}>
              Enter the email address on your account and we’ll send a link to
              pick a new password.
            </p>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputBase}
            />
            <button onClick={request} disabled={busy || !email.includes('@')} style={{ ...primaryBtn(busy || !email.includes('@')), marginTop: '14px' }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '10px 0 18px' }}>
              Pick a new password for your account. At least 8 characters.
            </p>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputBase} />
            <label style={{ ...labelStyle, marginTop: '14px' }}>CONFIRM PASSWORD</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputBase} />
            <button onClick={submitNew} disabled={busy || !password || !confirm} style={{ ...primaryBtn(busy || !password || !confirm), marginTop: '14px' }}>
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </>
        )}

        {error && (
          <div style={{ marginTop: '14px', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em',
  display: 'block', marginBottom: '6px',
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)',
  fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  background: disabled ? 'var(--color-disabled)' : GREEN, color: '#fff', fontSize: '15px', fontWeight: '700',
  cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
})
