import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight, ChevronLeft, User, Crown,
  SlidersHorizontal, HelpCircle,
  UserPlus, LogOut, Check, Copy, Share2, ChevronDown, ChevronUp, Leaf, Sun, Moon,
} from 'lucide-react'
import type { Screen } from '../types'
import { Toast, useToast } from '../components/Toast'
import { authAPI } from '../utils/api'
import { activeTheme, setTheme, type Theme } from '../utils/theme'

// Copy text using the Clipboard API, falling back to legacy execCommand.
// Returns false if both are unavailable (e.g. a sandboxed iframe or denied permission).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// When copying isn't allowed, highlight the link so the user can copy it by hand.
function selectElementText(el: HTMLElement | null) {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

type SubPage =
  | 'account' | 'subscription'
  | 'preferences' | 'help' | 'invite' | null

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
  onSignOut: () => void
}

const FAQ = [
  { q: 'How do I add a recipe?', a: 'Tap "Add Recipe" on the home screen. Fill in the recipe details, ingredients, and step-by-step instructions.' },
  { q: 'How does meal planning work?', a: 'Go to the Meals tab, create a new plan, then tap any day to assign a recipe to breakfast, lunch, or dinner.' },
  { q: 'Can I import recipes from other apps?', a: 'Yes! Tap the + button and choose Import — from a web link, a photo of a recipe card, or pasted text.' },
  { q: 'Can I use recipHub offline?', a: 'Once loaded, recipHub works offline for browsing your saved recipes. Adding or editing recipes requires an internet connection.' },
  { q: 'How do I delete my account?', a: 'Go to Account Settings and scroll to "Delete account". This action is permanent and cannot be undone.' },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ background: 'var(--color-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
        <ChevronLeft size={22} color="var(--color-text)" />
      </button>
      <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0, flex: 1 }}>{title}</h2>
      <div style={{ width: 34 }} />
    </div>
  )
}

function Row({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <button onClick={onPress} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: danger ? 'var(--color-error-bg)' : 'var(--color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ flex: 1, minWidth: 0, fontSize: '15px', color: danger ? '#ef4444' : 'var(--color-text)', fontWeight: '600' }}>{label}</span>
      {value && <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginRight: '2px' }}>{value}</span>}
      <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
    </button>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--color-subtle)', marginLeft: '66px' }} />
}

function SectionHeader({ label }: { label: string }) {
  return <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: '0 0 6px', padding: '0 16px' }}>{label}</p>
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '14px', background: saved ? 'var(--color-primary-bg)' : 'linear-gradient(135deg, #7ec063, #5a9449)', color: saved ? '#6ba356' : '#fff', border: saved ? '1.5px solid var(--color-primary-border)' : 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
      {saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
    </button>
  )
}

// ─── Sub-pages ────────────────────────────────────────────────────────────────

function AccountPage({ onBack }: { onBack: () => void }) {
  // Profile — loaded from the real account
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  // Password
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    authAPI.getProfile()
      .then((p: any) => {
        setName(p?.name || '')
        setUsername(p?.username || '')
        setEmail(p?.email || '')
      })
      .catch(err => console.error('Failed to load profile:', err))
  }, [])

  const saveProfile = async () => {
    setProfileError('')
    try {
      const updated: any = await authAPI.updateProfile({ name, username })
      setName(updated?.name ?? name)
      setUsername(updated?.username ?? '')
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile')
    }
  }
  const savePassword = () => {
    if (!current || !newPw || newPw !== confirm) return
    setPwSaved(true); setCurrent(''); setNewPw(''); setConfirm('')
    setTimeout(() => setPwSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
  const cardStyle: React.CSSProperties = { background: 'var(--color-card)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-subtle)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="Account" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', color: '#fff' }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>

        <SectionHeader label="PROFILE" />
        <div style={cardStyle}>
          <div>
            <label style={labelStyle}>NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '15px' }}>@</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="pick a username"
                autoCapitalize="none"
                autoCorrect="off"
                style={{ ...inputStyle, paddingLeft: '30px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '5px 0 0' }}>3–20 characters · letters, numbers, _ or .</p>
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input value={email} readOnly style={{ ...inputStyle, color: 'var(--color-text-muted)', cursor: 'not-allowed' }} />
          </div>
          {profileError && (
            <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{profileError}</p>
          )}
          <SaveButton onClick={saveProfile} saved={profileSaved} />
        </div>

        <SectionHeader label="CHANGE PASSWORD" />
        <div style={cardStyle}>
          {[
            { label: 'CURRENT PASSWORD', val: current, set: setCurrent },
            { label: 'NEW PASSWORD', val: newPw, set: setNewPw },
            { label: 'CONFIRM NEW PASSWORD', val: confirm, set: setConfirm },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <input value={val} onChange={e => set(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
            </div>
          ))}
          <SaveButton onClick={savePassword} saved={pwSaved} />
        </div>

        <SectionHeader label="DANGER ZONE" />
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-subtle)' }}>
          <button onClick={() => setShowDelete(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: 'var(--color-card)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color="#ef4444" />
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: '#ef4444', fontWeight: '500' }}>Delete account</span>
            <ChevronRight size={17} color="#cbd5e1" />
          </button>
          {showDelete && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-subtle)', background: 'var(--color-card)' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '12px 0' }}>This will permanently delete your account and all your recipes. This cannot be undone.</p>
              <button style={{ width: '100%', padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Permanently Delete Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Subscription({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="My Subscription" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '20px', border: '1px solid var(--color-subtle)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)' }}>Free Plan</span>
            <span style={{ background: 'var(--color-primary-bg)', color: '#6ba356', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px' }}>ACTIVE</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>You're on the free plan. Upgrade to unlock unlimited recipes, advanced meal planning, and more.</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #6ba356, #5a9449)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Crown size={20} color="#f4b860" />
            <span style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>Pro Plan</span>
          </div>
          {['Unlimited recipes', 'Advanced meal planning', 'Nutritional insights', 'Priority support', 'Export & backup'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Check size={14} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: '14px', color: '#fff' }}>{f}</span>
            </div>
          ))}
          <button style={{ marginTop: '14px', width: '100%', padding: '13px', background: 'var(--color-card)', color: '#6ba356', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            Upgrade for $4.99/mo
          </button>
        </div>
      </div>
    </div>
  )
}


function Preferences({ onBack, onNavigate }: { onBack: () => void; onNavigate: (screen: Screen) => void }) {
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial')
  const [temp, setTemp] = useState<'F' | 'C'>('F')
  const [servings, setServings] = useState(2)
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', borderRadius: '8px',
    border: `1.5px solid ${active ? '#6ba356' : 'var(--color-border)'}`,
    background: active ? 'var(--color-primary-bg)' : 'var(--color-card)',
    color: active ? '#6ba356' : 'var(--color-text-secondary)',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="Preferences" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <SectionHeader label="MEASUREMENTS" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-subtle)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>UNITS</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setUnits('imperial')} style={toggleStyle(units === 'imperial')}>Imperial</button>
              <button onClick={() => setUnits('metric')} style={toggleStyle(units === 'metric')}>Metric</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>TEMPERATURE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setTemp('F')} style={toggleStyle(temp === 'F')}>°F</button>
              <button onClick={() => setTemp('C')} style={toggleStyle(temp === 'C')}>°C</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>DEFAULT SERVINGS</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 4, 6].map(s => (
                <button key={s} onClick={() => setServings(s)} style={toggleStyle(servings === s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <SectionHeader label="DIET" />
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-subtle)', marginBottom: '20px' }}>
          <button onClick={() => onNavigate('diet-preferences')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: 'var(--color-card)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Leaf size={18} color="#6ba356" />
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: 'var(--color-text)', fontWeight: '500' }}>Diet preferences</span>
            <ChevronRight size={17} color="#cbd5e1" />
          </button>
        </div>

        <SaveButton onClick={save} saved={saved} />
      </div>
    </div>
  )
}

function HelpPage({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="Help" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Frequently asked questions</p>
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-subtle)' }}>
          {FAQ.map((item, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'var(--color-card)', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>{item.q}</span>
                {open === i ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
              </button>
              {open === i && (
                <div style={{ padding: '0 16px 14px', background: 'var(--color-card)' }}>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{item.a}</p>
                </div>
              )}
              {i < FAQ.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InvitePage({ onBack }: { onBack: () => void }) {
  const linkRef = useRef<HTMLParagraphElement>(null)
  const { toast, show } = useToast()
  const link = window.location.origin

  const copyLink = async () => {
    const ok = await copyText(link)
    if (ok) {
      show('Link copied to clipboard')
    } else {
      selectElementText(linkRef.current)
      show('Link selected — copy it manually', 'error')
    }
  }

  const share = async () => {
    // Prefer the native share sheet on devices that support it (mobile).
    if (navigator.share) {
      try {
        await navigator.share({ title: 'recipHub — Save. Plan. Cook Better.', text: 'Check out recipHub, the recipe & meal planning app I use!', url: link })
        return
      } catch (e) {
        // User dismissed the sheet — leave things as they are.
        if (e instanceof Error && e.name === 'AbortError') return
        // Any other failure: fall through to copying the link.
      }
    }
    copyLink()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', position: 'relative' }}>
      <SubHeader title="Invite Friends" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px' }}>Share recipHub</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>Invite friends and family to start cooking smarter together.</p>
        </div>
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-subtle)', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', margin: '0 0 6px', letterSpacing: '0.05em' }}>SHARE LINK</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p ref={linkRef} style={{ flex: 1, fontSize: '14px', color: '#6ba356', fontWeight: '600', margin: 0, wordBreak: 'break-all', userSelect: 'all' }}>{link}</p>
            <button onClick={copyLink} aria-label="Copy link" title="Copy link" style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={16} color="#6ba356" />
            </button>
          </div>
        </div>
        <button onClick={share} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Share2 size={16} /> Share recipHub
        </button>
      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen({ onNavigate, onSignOut }: Props) {
  const [subPage, setSubPage] = useState<SubPage>(null)
  const [theme, setThemeState] = useState<Theme>(activeTheme())
  const chooseTheme = (t: Theme) => { setTheme(t); setThemeState(t) }

  if (subPage === 'account') return <AccountPage onBack={() => setSubPage(null)} />
  if (subPage === 'subscription') return <Subscription onBack={() => setSubPage(null)} />
  if (subPage === 'preferences') return <Preferences onBack={() => setSubPage(null)} onNavigate={onNavigate} />
  if (subPage === 'help') return <HelpPage onBack={() => setSubPage(null)} />
  if (subPage === 'invite') return <InvitePage onBack={() => setSubPage(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>

      <div style={{ background: 'var(--color-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-subtle)' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={22} color="var(--color-text)" />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0, flex: 1 }}>Settings</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '20px 16px 24px' }}>
          <Row icon={<User size={18} color="var(--color-text-secondary)" />} label="Account" onPress={() => setSubPage('account')} />
          <Row icon={<Crown size={18} color="#f4b860" />} label="My subscription" value="Free" onPress={() => setSubPage('subscription')} />
          <Row icon={<SlidersHorizontal size={18} color="var(--color-text-secondary)" />} label="Preferences" onPress={() => setSubPage('preferences')} />
          <Row icon={<HelpCircle size={18} color="var(--color-text-secondary)" />} label="Help" onPress={() => setSubPage('help')} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="APPEARANCE" />
          <div style={{ margin: '0 16px', borderRadius: '14px', border: '1px solid var(--color-subtle)', background: 'var(--color-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px' }}>
              <Moon size={18} color="var(--color-text-secondary)" />
              <span style={{ flex: 1, fontSize: '15px', color: 'var(--color-text)', fontWeight: '500' }}>Theme</span>
              <div style={{ display: 'flex', background: 'var(--color-subtle)', borderRadius: '999px', padding: '3px' }}>
                {(['light', 'dark'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => chooseTheme(t)}
                    aria-pressed={theme === t}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                      borderRadius: '999px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: theme === t ? 'var(--color-card)' : 'transparent',
                      color: theme === t ? 'var(--color-text)' : 'var(--color-text-muted)',
                      fontSize: '13px', fontWeight: '700',
                      boxShadow: theme === t ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                    {t === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="CONNECT" />
          <div style={{ margin: '0 16px' }}>
            <Row icon={<UserPlus size={18} color="#6ba356" />} label="Invite friends" onPress={() => setSubPage('invite')} />
          </div>
        </div>

        <div style={{ margin: '0 16px 24px' }}>
          <button onClick={onSignOut} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(107,163,86,0.25)' }}>
            <LogOut size={17} />
            Log out
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>Version 1.0.0</p>

      </div>
    </div>
  )
}
