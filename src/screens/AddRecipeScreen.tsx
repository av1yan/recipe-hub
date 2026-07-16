import { ArrowLeft } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function AddRecipeScreen({ onNavigate }: Props) {
  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>Add Recipe</h2>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label>Recipe Name</label>
            <input type="text" className="input" placeholder="e.g., Pasta Carbonara" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Recipe</button>
        </form>
      </div>
      <BottomNavigation active="add" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
