import { Search } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function BrowseScreen({ onNavigate }: Props) {
  return (
    <div className="screen">
      <header style={{ padding: '14px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', borderRadius: '999px', padding: '10px 14px' }}>
          <Search size={16} color="#94a3b8" />
          <input type="text" placeholder="Search recipes..." style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px' }} />
        </div>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <p>Browse and search recipes</p>
        </div>
      </div>
      <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
