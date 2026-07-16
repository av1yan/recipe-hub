import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function GroceryListScreen({ onNavigate }: Props) {
  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <p>Manage your grocery lists</p>
      </div>
      <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
