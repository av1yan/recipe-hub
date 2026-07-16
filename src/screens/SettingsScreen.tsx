import { useState, useRef } from 'react'
import {
  ChevronRight, ChevronLeft, User, Settings as SettingsIcon, Crown,
  Globe, SlidersHorizontal, Smartphone, HelpCircle, Zap, BookOpen,
  Monitor, UserPlus, LogOut, Check, Copy, Share2, ChevronDown, ChevronUp, Leaf,
} from 'lucide-react'
import type { Screen } from '../types'

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

// Floating confirmation pill, anchored to the bottom of the phone frame.
function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  return (
    <div style={{ position: 'absolute', bottom: '28px', left: '16px', right: '16px', display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        background: tone === 'error' ? '#334155' : '#1e293b', color: '#fff',
        padding: '12px 18px', borderRadius: '999px', fontSize: '14px', fontWeight: '600',
        boxShadow: '0 10px 28px rgba(0,0,0,0.3)', maxWidth: '100%',
        animation: 'toastPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {tone === 'success' ? <Check size={16} color="#7ee08a" /> : <span style={{ fontSize: '14px' }}>⚠️</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</span>
      </div>
      <style>{`@keyframes toastPop { from { opacity: 0; transform: translateY(14px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }`}</style>
    </div>
  )
}

// Shows a Toast for a few seconds, replacing any toast already on screen.
function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const show = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }
  return { toast, show }
}

type SubPage =
  | 'edit-profile' | 'account' | 'subscription' | 'language'
  | 'preferences' | 'app-icon' | 'help' | 'shortcut'
  | 'import-guides' | 'desktop' | 'invite' | null

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
  onSignOut: () => void
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
]

const FAQ = [
  { q: 'How do I add a recipe?', a: 'Tap "Add Recipe" on the home screen. Fill in the recipe details, ingredients, and step-by-step instructions.' },
  { q: 'How does meal planning work?', a: 'Go to the Meals tab, create a new plan, then tap any day to assign a recipe to breakfast, lunch, or dinner.' },
  { q: 'Can I import recipes from other apps?', a: 'Yes! Check "Read our import guides" in the Get Set Up section for step-by-step instructions for Paprika, AnyList, and more.' },
  { q: 'Can I use recipHub offline?', a: 'Once loaded, recipHub works offline for browsing your saved recipes. Adding or editing recipes requires an internet connection.' },
  { q: 'How do I delete my account?', a: 'Go to Account Settings and scroll to "Delete account". This action is permanent and cannot be undone.' },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
        <ChevronLeft size={22} color="#1e293b" />
      </button>
      <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0, flex: 1 }}>{title}</h2>
      <div style={{ width: 34 }} />
    </div>
  )
}

function Row({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <button onClick={onPress} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: danger ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: '15px', color: danger ? '#ef4444' : '#1e293b', fontWeight: '500' }}>{label}</span>
      {value && <span style={{ fontSize: '13px', color: '#94a3b8', marginRight: '4px' }}>{value}</span>}
      <ChevronRight size={17} color="#cbd5e1" />
    </button>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: '#f1f5f9', marginLeft: '66px' }} />
}

function SectionHeader({ label }: { label: string }) {
  return <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', margin: '0 0 6px', padding: '0 16px' }}>{label}</p>
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '14px', background: saved ? '#f0f7ed' : 'linear-gradient(135deg, #7ec063, #5a9449)', color: saved ? '#6ba356' : '#fff', border: saved ? '1.5px solid #c8e0bc' : 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
      {saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
    </button>
  )
}

// ─── Sub-pages ────────────────────────────────────────────────────────────────

function EditProfile({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('Alex Johnson')
  const [email, setEmail] = useState('alex@example.com')
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Edit Profile" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', color: '#fff' }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
          </div>
        </div>
        <SaveButton onClick={save} saved={saved} />
      </div>
    </div>
  )
}

function AccountSettings({ onBack }: { onBack: () => void }) {
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const save = () => {
    if (!current || !newPw || newPw !== confirm) return
    setSaved(true); setCurrent(''); setNewPw(''); setConfirm('')
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Account Settings" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <SectionHeader label="CHANGE PASSWORD" />
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <SaveButton onClick={save} saved={saved} />
        </div>

        <SectionHeader label="DANGER ZONE" />
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <button onClick={() => setShowDelete(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color="#ef4444" />
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: '#ef4444', fontWeight: '500' }}>Delete account</span>
            <ChevronRight size={17} color="#cbd5e1" />
          </button>
          {showDelete && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '12px 0' }}>This will permanently delete your account and all your recipes. This cannot be undone.</p>
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="My Subscription" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Free Plan</span>
            <span style={{ background: '#f0f7ed', color: '#6ba356', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px' }}>ACTIVE</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>You're on the free plan. Upgrade to unlock unlimited recipes, advanced meal planning, and more.</p>
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
          <button style={{ marginTop: '14px', width: '100%', padding: '13px', background: '#fff', color: '#6ba356', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            Upgrade for $4.99/mo
          </button>
        </div>
      </div>
    </div>
  )
}

function LanguagePage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState('en')
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Language" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          {LANGUAGES.map((lang, i) => (
            <div key={lang.code}>
              <button onClick={() => setSelected(lang.code)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ flex: 1, fontSize: '15px', color: '#1e293b', fontWeight: selected === lang.code ? '600' : '400' }}>
                  {lang.native}
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400', marginLeft: '8px' }}>{lang.label}</span>
                </span>
                {selected === lang.code && <Check size={18} color="#6ba356" />}
              </button>
              {i < LANGUAGES.length - 1 && <Divider />}
            </div>
          ))}
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
    border: `1.5px solid ${active ? '#6ba356' : '#e2e8f0'}`,
    background: active ? '#f0f7ed' : '#fff',
    color: active ? '#6ba356' : '#64748b',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Preferences" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <SectionHeader label="MEASUREMENTS" />
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>UNITS</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setUnits('imperial')} style={toggleStyle(units === 'imperial')}>Imperial</button>
              <button onClick={() => setUnits('metric')} style={toggleStyle(units === 'metric')}>Metric</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>TEMPERATURE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setTemp('F')} style={toggleStyle(temp === 'F')}>°F</button>
              <button onClick={() => setTemp('C')} style={toggleStyle(temp === 'C')}>°C</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>DEFAULT SERVINGS</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 4, 6].map(s => (
                <button key={s} onClick={() => setServings(s)} style={toggleStyle(servings === s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <SectionHeader label="DIET" />
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
          <button onClick={() => onNavigate('diet-preferences')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Leaf size={18} color="#6ba356" />
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>Diet preferences</span>
            <ChevronRight size={17} color="#cbd5e1" />
          </button>
        </div>

        <SaveButton onClick={save} saved={saved} />
      </div>
    </div>
  )
}

function AppIconPage({ onBack }: { onBack: () => void }) {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const showBoth = !isIOS && !isAndroid

  const iosSteps = ['Tap the Share button at the bottom of Safari (the box with ↑ arrow)', 'Scroll down and tap "Add to Home Screen"', 'Tap "Add" in the top right corner']
  const androidSteps = ['Tap the ⋮ menu in the top right of Chrome', 'Tap "Add to Home screen"', 'Tap "Add" to confirm']

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Add to Home Screen" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>📱</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>Add recipHub to your home screen</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Access it instantly like a native app — no app store needed.</p>
        </div>

        {(isIOS || showBoth) && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', margin: '0 0 12px' }}>ON iPhone / iPad (Safari)</p>
            {iosSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: i < iosSteps.length - 1 ? '10px' : 0 }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '11px', background: '#6ba356', color: '#fff', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <p style={{ fontSize: '14px', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>
        )}

        {(isAndroid || showBoth) && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', margin: '0 0 12px' }}>ON Android (Chrome)</p>
            {androidSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: i < androidSteps.length - 1 ? '10px' : 0 }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '11px', background: '#6ba356', color: '#fff', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <p style={{ fontSize: '14px', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HelpPage({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Help" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>Frequently asked questions</p>
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          {FAQ.map((item, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{item.q}</span>
                {open === i ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
              </button>
              {open === i && (
                <div style={{ padding: '0 16px 14px', background: '#fff' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{item.a}</p>
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

function ImportGuides({ onBack }: { onBack: () => void }) {
  const guides = [
    { app: 'Paprika', steps: ['Open Paprika → Settings → Export', 'Choose "Paprika Recipe Format (.paprikarecipes)"', 'Share the file to recipHub via the Import option'] },
    { app: 'AnyList', steps: ['Go to AnyList → My Recipes', 'Tap Share → Export as CSV', 'In recipHub, tap Add Recipe → Import'] },
    { app: 'From the web', steps: ['Find any recipe on a website and copy its URL', 'In recipHub, tap Add Recipe → "Import from URL"', 'Paste the URL and tap Import'] },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <SubHeader title="Import Guides" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>Bring your recipes from other apps into recipHub.</p>
        {guides.map((guide, gi) => (
          <div key={gi} style={{ marginBottom: '16px' }}>
            <SectionHeader label={guide.app.toUpperCase()} />
            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9' }}>
              {guide.steps.map((step, si) => (
                <div key={si} style={{ display: 'flex', gap: '12px', marginBottom: si < guide.steps.length - 1 ? '10px' : 0 }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '11px', background: '#f0f7ed', color: '#6ba356', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{si + 1}</div>
                  <p style={{ fontSize: '14px', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DesktopPage({ onBack }: { onBack: () => void }) {
  const urlRef = useRef<HTMLParagraphElement>(null)
  const { toast, show } = useToast()
  const url = window.location.origin

  const copy = async () => {
    const ok = await copyText(url)
    if (ok) {
      show('Link copied to clipboard')
    } else {
      selectElementText(urlRef.current)
      show('Link selected — press copy to save it', 'error')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', position: 'relative' }}>
      <SubHeader title="Use on Desktop" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🖥️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>recipHub on desktop</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Open the link below in any browser on your computer.</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', margin: '0 0 6px', letterSpacing: '0.05em' }}>URL</p>
          <p ref={urlRef} style={{ fontSize: '14px', color: '#6ba356', fontWeight: '600', margin: 0, wordBreak: 'break-all', userSelect: 'all' }}>{url}</p>
        </div>
        <button onClick={copy} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Copy size={16} /> Copy Link
        </button>
      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', position: 'relative' }}>
      <SubHeader title="Invite Friends" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>Share recipHub</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Invite friends and family to start cooking smarter together.</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', margin: '0 0 6px', letterSpacing: '0.05em' }}>SHARE LINK</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p ref={linkRef} style={{ flex: 1, fontSize: '14px', color: '#6ba356', fontWeight: '600', margin: 0, wordBreak: 'break-all', userSelect: 'all' }}>{link}</p>
            <button onClick={copyLink} aria-label="Copy link" title="Copy link" style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', background: '#f0f7ed', border: '1px solid #c8e0bc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  if (subPage === 'edit-profile') return <EditProfile onBack={() => setSubPage(null)} />
  if (subPage === 'account') return <AccountSettings onBack={() => setSubPage(null)} />
  if (subPage === 'subscription') return <Subscription onBack={() => setSubPage(null)} />
  if (subPage === 'language') return <LanguagePage onBack={() => setSubPage(null)} />
  if (subPage === 'preferences') return <Preferences onBack={() => setSubPage(null)} onNavigate={onNavigate} />
  if (subPage === 'app-icon' || subPage === 'shortcut') return <AppIconPage onBack={() => setSubPage(null)} />
  if (subPage === 'help') return <HelpPage onBack={() => setSubPage(null)} />
  if (subPage === 'import-guides') return <ImportGuides onBack={() => setSubPage(null)} />
  if (subPage === 'desktop') return <DesktopPage onBack={() => setSubPage(null)} />
  if (subPage === 'invite') return <InvitePage onBack={() => setSubPage(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={22} color="#1e293b" />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0, flex: 1 }}>Settings</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ marginTop: '20px', marginBottom: '24px' }}>
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<User size={18} color="#64748b" />} label="Edit profile" onPress={() => setSubPage('edit-profile')} />
            <Divider />
            <Row icon={<SettingsIcon size={18} color="#64748b" />} label="Account settings" onPress={() => setSubPage('account')} />
            <Divider />
            <Row icon={<Crown size={18} color="#f4b860" />} label="My subscription" value="Free" onPress={() => setSubPage('subscription')} />
            <Divider />
            <Row icon={<Globe size={18} color="#64748b" />} label="Language" value="English" onPress={() => setSubPage('language')} />
            <Divider />
            <Row icon={<SlidersHorizontal size={18} color="#64748b" />} label="Preferences" onPress={() => setSubPage('preferences')} />
            <Divider />
            <Row icon={<Smartphone size={18} color="#64748b" />} label="App icon" onPress={() => setSubPage('app-icon')} />
            <Divider />
            <Row icon={<HelpCircle size={18} color="#64748b" />} label="Help" onPress={() => setSubPage('help')} />
          </div>
        </div>

        <div style={{ margin: '0 16px 28px' }}>
          <button onClick={onSignOut} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(107,163,86,0.25)' }}>
            <LogOut size={17} />
            Log out
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="GET SET UP" />
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<Zap size={18} color="#6ba356" />} label="Add the recipHub shortcut" onPress={() => setSubPage('shortcut')} />
            <Divider />
            <Row icon={<BookOpen size={18} color="#64748b" />} label="Read our import guides" onPress={() => setSubPage('import-guides')} />
            <Divider />
            <Row icon={<Monitor size={18} color="#64748b" />} label="Use recipHub on desktop" onPress={() => setSubPage('desktop')} />
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <SectionHeader label="CONNECT" />
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<UserPlus size={18} color="#6ba356" />} label="Invite friends" onPress={() => setSubPage('invite')} />
            <Divider />
            <Row icon={<HelpCircle size={18} color="#64748b" />} label="Help" onPress={() => setSubPage('help')} />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#cbd5e1', marginBottom: '24px' }}>Version 1.0.0</p>

      </div>
    </div>
  )
}
