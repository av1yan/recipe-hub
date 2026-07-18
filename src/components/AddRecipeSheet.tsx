import { Image, Type, Link2, PenLine, X } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from './BottomNavigation'

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (screen: Screen, data?: any) => void
}

const TINT = 'var(--color-primary-bg)'
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
        role="dialog"
        aria-label="Add a recipe"
        style={{
          // Anchored to the phone frame, so it must start below the status bar
          // (44px in App) rather than painting over it like no other screen does.
          position: 'absolute', top: '44px', left: 0, right: 0, bottom: 0, zIndex: 41,
          background: 'var(--color-card)', display: 'flex', flexDirection: 'column',
          animation: 'rh-panel-up 0.24s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
            Add a recipe
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '34px', height: '34px', borderRadius: '17px', border: 'none',
              background: 'var(--color-subtle)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={18} color="var(--color-text-secondary)" />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.55 }}>
            Bring one in from somewhere, or start with a blank page. Anything
            imported opens in the form for you to check first.
          </p>

          <button onClick={() => go('import-social')} style={wideCard}>
            <SocialIcons />
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>
                Import from social media
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Paste a link from Instagram or TikTok
              </p>
            </div>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Tile icon={<Image size={19} color={GREEN} />} label="Import from photo" hint="Read a recipe card" onClick={() => go('import-photo')} />
            <Tile icon={<Type size={19} color={GREEN} />} label="Import from text" hint="Paste and tidy" onClick={() => go('import-text')} />
            <Tile icon={<Link2 size={19} color={GREEN} />} label="Import from web" hint="From a recipe page" onClick={() => go('import-web')} />
            <Tile icon={<PenLine size={19} color={GREEN} />} label="Write from scratch" hint="A blank form" onClick={() => go('add-recipe', { fromAddPanel: true })} />
          </div>
        </div>

        {/* The panel fills the screen, so bring the nav with it -- otherwise
            the only way off was the X. The "+" is inert here: it's the button
            that opened this panel, so tapping it again should keep you put
            rather than snap the panel shut (which read as a jolt). Close is
            the header X, or tap another tab. */}
        <BottomNavigation active="" onNavigate={(s) => go(s as Screen)} onAdd={() => {}} />
      </div>

      <style>{`
        @keyframes rh-panel-up { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </>
  )
}

function Tile({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px',
        padding: '16px', background: 'var(--color-card)', border: '1px solid #e8eef0',
        borderRadius: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: '38px', height: '38px', borderRadius: '19px', background: TINT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: 'var(--color-text)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{hint}</span>
      </span>
    </button>
  )
}

const wideCard: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
  padding: '16px 14px', background: 'var(--color-card)', border: '1px solid #e8eef0',
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
