import { X } from 'lucide-react'
import type { Screen, Recipe } from '../types'

interface Props {
  recipe: Recipe | null
  onNavigate: (screen: Screen) => void
}

export default function CookingModeScreen({ recipe, onNavigate }: Props) {
  if (!recipe) return null

  return (
    <div className="screen" style={{ background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>{recipe.name}</h2>
        <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
          <X size={22} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}>
        <p>Full-Screen Recipe Guide - Cook Mode</p>
      </div>
    </div>
  )
}
