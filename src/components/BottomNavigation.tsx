import { Home, Search, Plus, Calendar, ShoppingCart } from 'lucide-react'

interface Props {
  active: string
  onNavigate: (tab: string) => void
}

const tabs = [
  { id: 'home', icon: Home, label: 'Home', screen: 'home' },
  { id: 'browse', icon: Search, label: 'Browse', screen: 'browse' },
  { id: 'add', icon: Plus, label: '', screen: 'add-recipe', accent: true },
  { id: 'meal-plan', icon: Calendar, label: 'Meals', screen: 'meal-plan' },
  { id: 'grocery', icon: ShoppingCart, label: 'Groceries', screen: 'grocery' },
]

export function BottomNavigation({ active, onNavigate }: Props) {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'saturate(180%) blur(24px)',
      WebkitBackdropFilter: 'saturate(180%) blur(24px)',
      borderTop: '0.5px solid rgba(0, 0, 0, 0.12)',
      boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.04)',
      paddingBottom: '6px',
      paddingTop: '2px',
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id
        if (tab.accent) {
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.screen)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '6px 0 4px',
                border: 'none', background: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #7ec063, #5a9449)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(107, 163, 86, 0.4)',
              }}>
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </div>
            </button>
          )
        }
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.screen)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '8px 0 4px',
              border: 'none', background: 'none', cursor: 'pointer',
              gap: '3px',
              color: isActive ? '#6ba356' : '#94a3b8',
              transition: 'color 0.2s ease',
              position: 'relative',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: '20px',
                height: '2.5px',
                borderRadius: '0 0 3px 3px',
                background: '#6ba356',
              }} />
            )}
            <tab.icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.8}
              color={isActive ? '#6ba356' : '#94a3b8'}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.01em',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
