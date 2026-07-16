import { Home, Search, Plus, Calendar, ShoppingCart } from 'lucide-react'

interface Props {
  active: string
  onNavigate: (tab: string) => void
}

export function BottomNavigation({ active, onNavigate }: Props) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', screen: 'home' },
    { id: 'browse', icon: Search, label: 'Browse', screen: 'browse' },
    { id: 'add', icon: Plus, label: '', screen: 'add-recipe', accent: true },
    { id: 'meal-plan', icon: Calendar, label: 'Meals', screen: 'meal-plan' },
    { id: 'grocery', icon: ShoppingCart, label: 'Groceries', screen: 'grocery' },
  ]

  return (
    <nav style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', flexShrink: 0 }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onNavigate(tab.screen)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: tab.accent ? '6px 0 10px' : '8px 0 10px', border: 'none', background: 'none', cursor: 'pointer', gap: tab.accent ? 3 : 0, color: active === tab.id ? '#c67139' : '#94a3b8', transition: 'color 0.2s ease' }}>
          <tab.icon size={22} />
          {tab.label && <span style={{ fontSize: '11px', fontWeight: '600' }}>{tab.label}</span>}
        </button>
      ))}
    </nav>
  )
}
