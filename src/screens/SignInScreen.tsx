import { useState } from 'react'
import type { Screen, User } from '../types'

interface Props {
  onSignIn: (user: User) => void
  onNavigate: (screen: Screen) => void
}

export default function SignInScreen({ onSignIn }: Props) {
  const [email, setEmail] = useState('')

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    onSignIn({ id: '1', name: 'Alex Johnson', email })
  }

  return (
    <div className="screen" style={{ background: '#fff', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>Welcome</h1>
          <p style={{ color: 'rgba(32, 30, 29, 0.6)', marginBottom: 0 }}>Sign in to RECIPhub</p>
        </div>

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
        </form>
      </div>
    </div>
  )
}
