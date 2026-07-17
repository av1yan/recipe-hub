import { Image, Type, Link2, PenLine } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (screen: Screen, data?: any) => void
}

const TINT = '#eaf3e6'
const GREEN = '#6ba356'

/**
 * The chooser behind the "+" — every route into a new recipe in one place.
 *
 * Each tile lands on a real flow; nothing here is decorative. All the import
 * paths end at the normal Add Recipe form pre-filled, so a parse is always
 * reviewed by a person before it is saved.
 */
export function AddRecipeSheet({ open, onClose, onNavigate }: Props) {
  if (!open) return null

  const go = (screen: Screen, data?: any) => {
    onClose()
    onNavigate(screen, data)
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 40, animation: 'rh-fade 0.18s ease-out',
        }}
      />
      <div
        role="dialog"
        aria-label="Add a recipe"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
          background: '#fff', borderRadius: '22px 22px 0 0',
          padding: '10px 16px 24px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
          animation: 'rh-sheet-up 0.24s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: '#e2e8f0', margin: '0 auto 14px' }} />
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', textAlign: 'center', margin: '0 0 16px' }}>
          Add a recipe
        </h2>

        <button onClick={() => go('import-social')} style={wideCard}>
          <SocialIcons />
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
              Import from social media
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              Paste a link from Instagram or TikTok
            </p>
          </div>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <Tile icon={<Image size={19} color={GREEN} />} label="Import from photo" onClick={() => go('import-photo')} />
          <Tile icon={<Type size={19} color={GREEN} />} label="Import from text" onClick={() => go('import-text')} />
          <Tile icon={<Link2 size={19} color={GREEN} />} label="Import from web" onClick={() => go('import-web')} />
          <Tile icon={<PenLine size={19} color={GREEN} />} label="Write from scratch" onClick={() => go('add-recipe')} />
        </div>
      </div>

      <style>{`
        @keyframes rh-sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes rh-fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  )
}

function Tile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px',
        padding: '14px', background: '#fff', border: '1px solid #e8eef0',
        borderRadius: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: '38px', height: '38px', borderRadius: '19px', background: TINT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>{label}</span>
    </button>
  )
}

const wideCard: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
  padding: '16px 14px', background: '#fff', border: '1px solid #e8eef0',
  borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit',
}

/** The overlapping platform marks from the reference, drawn rather than fetched. */
function SocialIcons() {
  const ring: React.CSSProperties = {
    width: '30px', height: '30px', borderRadius: '15px', border: '2px solid #fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <span style={{ ...ring, background: 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" stroke="none" />
        </svg>
      </span>
      <span style={{ ...ring, background: '#000', marginLeft: '-9px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
          <path d="M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3v12.1a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12V9.5a5.7 5.7 0 1 0 4.85 5.63V9.1a7.8 7.8 0 0 0 4.55 1.46V7.5a4.8 4.8 0 0 1-3.58-1.7z" />
        </svg>
      </span>
      <span style={{ ...ring, background: '#1877f2', marginLeft: '-9px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
          <path d="M14 9h2.5l.5-3H14V4.4c0-.9.3-1.4 1.5-1.4H17V.2A21 21 0 0 0 14.8 0C12.3 0 10.7 1.5 10.7 4v2H8.3v3h2.4v9H14V9z" />
        </svg>
      </span>
    </div>
  )
}
