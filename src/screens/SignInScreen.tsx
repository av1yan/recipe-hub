import { useState, useEffect } from 'react'
import { Mail, Lock, AtSign, ChefHat } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import type { Screen } from '../types'
import { authAPI, oauthStartUrl } from '../utils/api'
import { signInWithProviderNative } from '../utils/oauthNative'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, name: string, password: string) => Promise<void>
  onAppleNative: (identityToken: string, name?: string) => Promise<void>
  onOAuthToken: (token: string) => Promise<void>
  onNavigate: (screen: Screen) => void
}

// On iOS, App Store review requires the platform-native Sign in with Apple
// sheet -- the web redirect flow won't pass in a WebView -- so the native
// button runs Apple's own sheet instead of navigating out.
const isNative = Capacitor.isNativePlatform()
// That sheet (@capacitor-community/apple-sign-in) is iOS-only: Android has no
// Apple Services ID configured, so calling it there just errors. Gate the
// Apple button to iOS -- Android shows only Google + email.
const isIOS = Capacitor.getPlatform() === 'ios'

export default function SignInScreen({ onSignIn, onSignUp, onAppleNative, onOAuthToken, onNavigate }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState({ google: false, apple: false })
  // No mail server means no reset link, so don't offer one.
  const [resetAvailable, setResetAvailable] = useState(false)

  useEffect(() => {
    // Unreachable or unconfigured just means no buttons, which is the honest
    // default -- never block the password form on this.
    authAPI.oauthProviders()
      .then((p: any) => setProviders({ google: Boolean(p?.google), apple: Boolean(p?.apple) }))
      .catch(() => {})
    authAPI.passwordResetAvailable()
      .then((r: any) => setResetAvailable(Boolean(r?.available)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // The OAuth callback bounces back here with the reason in the fragment.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const oauthError = params.get('oauth_error')
    if (oauthError) {
      setError(oauthError)
      history.replaceState(null, '', window.location.pathname)
    }
  }, [])

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

  const handleAppleNative = async () => {
    setError('')
    setLoading(true)
    try {
      const { response } = await SignInWithApple.authorize({
        // Ignored by the native iOS sheet (it uses the app's bundle id); still
        // required by the plugin's type and used by its web/Android fallback.
        clientId: 'com.reciphub.app',
        redirectURI: 'https://recipe-hub-orcin-ten.vercel.app',
        scopes: 'name email',
      })
      if (!response?.identityToken) throw new Error('missing-token')
      // Apple only sends the name on the first authorization; join what's there.
      const name = [response.givenName, response.familyName].filter(Boolean).join(' ').trim()
      await onAppleNative(response.identityToken, name || undefined)
    } catch (err: any) {
      // A cancelled sheet (ASAuthorizationError.canceled = 1001) isn't a failure.
      const msg = String(err?.message ?? err?.code ?? '')
      if (/cancel/i.test(msg) || msg.includes('1001')) return
      setError('Apple sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Native Google: Google blocks its consent screen inside a WebView, so run the
  // flow in the system browser and take the token back through the deep link.
  const handleGoogleNative = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithProviderNative('google')
      if ('token' in result) await onOAuthToken(result.token)
      else if ('error' in result) setError(result.error)
      // A cancelled browser is not a failure -- leave the form as it was.
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)', padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChefHat size={34} color="#fff" strokeWidth={2} />
          </div>
        </div>
        <h1 style={{ fontSize: '27px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text)', margin: '0 0 6px', wordBreak: 'break-word' }}>
          {isSignUp ? 'Create your account' : 'Welcome to recipHub'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, wordBreak: 'break-word' }}>
          {isSignUp ? 'Start cooking smarter in about a minute' : 'Sign in to continue'}
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-bg)', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px', color: 'var(--color-error)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
        {isSignUp && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                border: 'none',
                borderRadius: '12px',
                background: 'var(--color-subtle)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            {isSignUp ? 'Email' : 'Email or username'}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isSignUp
              ? <Mail size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              : <AtSign size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />}
            <input
              // Signing up needs a real address, but signing in also takes a
              // username -- type="email" would reject one as malformed.
              type={isSignUp ? 'email' : 'text'}
              placeholder={isSignUp ? 'Email' : 'Email or username'}
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                fontSize: '15px',
                border: 'none',
                borderRadius: '12px',
                background: 'var(--color-subtle)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                fontSize: '15px',
                border: 'none',
                borderRadius: '12px',
                background: 'var(--color-subtle)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {!isSignUp && resetAvailable && (
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
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
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: '8px',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setIsSignUp(!isSignUp); setError('') }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)', padding: '4px 0 18px', fontFamily: 'inherit', width: '100%' }}
      >
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <strong style={{ color: 'var(--color-primary)' }}>{isSignUp ? 'Sign in' : 'Sign up'}</strong>
      </button>

      {/* Native providers. Google runs in the system browser on any platform;
          the Apple sheet is iOS-only (see isIOS). Skip the whole block -- divider
          included -- when neither is available, so Android never shows a lone "or". */}
      {isNative ? (
        (providers.google || isIOS) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Google runs in the system browser and returns via the deep link.
                  Only offered when the API reports the credentials are configured. */}
              {providers.google && (
                <button
                  type="button"
                  onClick={handleGoogleNative}
                  disabled={loading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 16px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  <GoogleIcon />
                  Sign in with Google
                </button>
              )}

              {/* The native Apple sheet needs no server-side Apple credentials --
                  the app gets a signed token Apple's public keys verify -- but the
                  plugin only implements it on iOS, so it's gated there. */}
              {isIOS && (
                <button
                  type="button"
                  onClick={handleAppleNative}
                  disabled={loading}
                  // var(--color-text)/var(--color-bg) resolve to Apple's black button on
                  // a light theme and its white button on a dark one -- both HIG variants.
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 16px',
                    border: 'none',
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  <AppleIcon color="var(--color-bg)" />
                  Sign in with Apple
                </button>
              )}
            </div>
          </>
        )
      ) : (
        /* Web: a provider with no credentials configured would be a dead button,
           so only offer the ones the API reports as ready. */
        (providers.google || providers.apple) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {providers.google && (
                <OAuthButton provider="google" label="Google" icon={<GoogleIcon />} />
              )}
              {providers.apple && (
                <OAuthButton provider="apple" label="Apple" icon={<AppleIcon />} />
              )}
            </div>
          </>
        )
      )}
    </div>
  )
}

function OAuthButton({ provider, label, icon }: { provider: string; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      // A full-page redirect, not fetch: the provider must be able to show its
      // own consent screen, and it refuses to render inside a frame.
      onClick={() => { window.location.href = oauthStartUrl(provider) }}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 16px',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AppleIcon({ color = 'var(--color-text)' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden="true" fill={color}>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}
