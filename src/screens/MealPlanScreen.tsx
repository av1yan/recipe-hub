import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function MealPlanScreen({ onNavigate }: Props) {
  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Meal Plan</h2>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <p>Plan your weekly meals</p>
      </div>
      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
