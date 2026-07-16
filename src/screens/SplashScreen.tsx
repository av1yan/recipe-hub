import { useEffect } from 'react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function SplashScreen({ onNavigate }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate('signin')
    }, 2000)
    return () => clearTimeout(timer)
  }, [onNavigate])

  return (
    <div className="screen" style={{ background: 'linear-gradient(135deg, #f4a261, #e9c46a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>🍳 RECIPhub</h1>
        <p style={{ fontSize: '18px', opacity: 0.9 }}>Save. Plan. Cook Better.</p>
      </div>
    </div>
  )
}
