import { ArrowLeft, LogOut } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
  onSignOut: () => void
}

export default function SettingsScreen({ onNavigate, onSignOut }: Props) {
  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>Settings</h2>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Account</h3>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Name</label>
          <input type="text" className="input" defaultValue="Alex Johnson" />
        </div>
        <button onClick={onSignOut} style={{ width: '100%', padding: '12px', background: '#fff', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
