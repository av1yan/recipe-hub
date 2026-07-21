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
import { useProPlan, FREE_RECIPE_LIMIT, FREE_COOKBOOK_LIMIT } from '../utils/proPlan'
import { getDietPrefs, DIET_OPTIONS, DIET_PREFS_KEY } from './DietPreferencesScreen'
import { getAllergies, saveAllergies, ALLERGY_OPTIONS } from '../utils/allergies'
import { getUnitPref, setUnitPref, getDefaultServings, setDefaultServings } from '../utils/preferences'
import { getCalorieGoal, setCalorieGoal, getMacroGoals, setMacroGoal } from '../utils/goals'

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

function Row({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  return (
    <button onClick={onPress} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: danger ? 'var(--color-error-bg)' : 'var(--color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ flex: 1, minWidth: 0, fontSize: '15px', color: danger ? '#ef4444' : 'var(--color-text)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {value && <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginRight: '2px', flexShrink: 0 }}>{value}</span>}
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
    <button onClick={onClick} style={{ width: '100%', padding: '12px', background: saved ? 'var(--color-primary-bg)' : 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: saved ? 'var(--color-primary)' : '#fff', border: saved ? '1.5px solid var(--color-primary-border)' : 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
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
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', color: '#fff' }}>
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

const PRO_FEATURES = [
  { title: 'Cook with what I have', desc: 'Recipes you can make from your pantry' },
  { title: 'Insights', desc: 'Your week, read for you — balance, variety, tips' },
  { title: 'AI cooking assistant', desc: 'Adapt any recipe — dairy-free, gluten-free, lower-cal' },
  { title: 'Family share & sync', desc: 'One live grocery list for the whole household' },
  { title: 'Unlimited recipes & cookbooks', desc: `Free stops at ${FREE_RECIPE_LIMIT} recipes / ${FREE_COOKBOOK_LIMIT} cookbook` },
  { title: 'Automatic grocery lists', desc: 'A week’s plan → one shopping list' },
  { title: 'Plan any week', desc: 'Free is this week only; Pro, any week' },
  { title: 'Export & share', desc: 'Send your list or plan anywhere' },
  { title: 'Nutrition & goals', desc: 'Daily macros and calorie targets' },
]

function Subscription({ onBack }: { onBack: () => void }) {
  const [isPro, setPro] = useProPlan()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="My Subscription" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Current plan. On Pro the perks live here, since the upsell card below
            is only shown to Free users -- selling Pro to a Pro user is noise. */}
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '16px 18px', border: '1px solid var(--color-subtle)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '3px' }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '19px', fontWeight: '800', color: 'var(--color-text)' }}>
                {isPro && <Crown size={18} color="#f4b860" />}
                {isPro ? 'Pro' : 'Free'}
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', padding: '5px 11px', borderRadius: '999px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />
              Active
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '10px 0 0', lineHeight: 1.5 }}>
            {isPro
              ? 'Pro is on — every feature below is unlocked.'
              : 'Everything you need to save and cook your own recipes.'}
          </p>

          {isPro && (
            <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-subtle)', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '11px' }}>Included</div>
              {PRO_FEATURES.map(f => (
                <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '11px' }}>
                  <Check size={15} color="var(--color-primary)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', lineHeight: 1.2 }}>{f.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* On Pro: downgrade gets its own quiet tile, not buried in an upsell. */}
        {isPro && (
          <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '14px 18px', border: '1px solid var(--color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>Switch back to Free</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>Keep your recipes; lose the Pro features.</div>
            </div>
            <button onClick={() => setPro(false)} style={{ flexShrink: 0, padding: '9px 15px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Switch
            </button>
          </div>
        )}

        {/* On Free: the full gold upsell card. */}
        {!isPro && (
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '13px' }}>
              <Crown size={20} color="#f4b860" />
              <span style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>Pro Plan</span>
            </div>
            {PRO_FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Check size={15} color="#fff" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{f.desc}</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setPro(true)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)' }}
              style={{ marginTop: '16px', width: '100%', padding: '13px', background: 'var(--color-card)', color: 'var(--color-primary)', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transition: 'transform 0.14s ease, box-shadow 0.2s ease' }}
            >
              Upgrade for $4.99/mo
            </button>
            <p style={{ margin: '9px 0 0', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              Cancel anytime — no commitment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


function Preferences({ onBack }: { onBack: () => void }) {
  const [units, setUnitsState] = useState<'imperial' | 'metric'>(() => getUnitPref())
  const [temp, setTemp] = useState<'F' | 'C'>('F')
  const [servings, setServingsState] = useState(() => getDefaultServings())
  const [diet, setDiet] = useState<string[]>(() => getDietPrefs())
  const [allergies, setAllergiesState] = useState<string[]>(() => getAllergies())
  const [goal, setGoalState] = useState(() => getCalorieGoal())
  const [macros, setMacrosState] = useState(() => getMacroGoals())
  const [saved, setSaved] = useState(false)
  // Calorie/macro goals feed Insights and the meal-plan nutrition bar — both
  // Pro — so the whole section only shows once Pro is active.
  const [isPro] = useProPlan()

  // Units, default servings and the calorie goal persist the moment they change,
  // so recipes and Insights reflect them straight away.
  const setUnits = (u: 'imperial' | 'metric') => { setUnitsState(u); setUnitPref(u) }
  const setServings = (s: number) => { setServingsState(s); setDefaultServings(s) }
  const setGoal = (v: number) => { const n = Math.min(6000, Math.max(1000, Math.round(v / 50) * 50)); setGoalState(n); setCalorieGoal(n) }
  const setMacro = (m: 'protein' | 'carbs' | 'fat', v: number) => {
    const n = Math.min(500, Math.max(0, Math.round(v / 5) * 5))
    setMacrosState(prev => ({ ...prev, [m]: n })); setMacroGoal(m, n)
  }

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px', borderRadius: '8px',
    border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-primary-bg)' : 'var(--color-card)',
    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  })

  // Diet and allergy pills persist the moment they're tapped (like onboarding),
  // so Browse picks them up without needing Save.
  const pill = (active: boolean, accent: string): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: '999px',
    border: `1.5px solid ${active ? accent : 'var(--color-border)'}`,
    background: active ? accent : 'var(--color-card)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  })
  const toggleDiet = (id: string) => setDiet(prev => {
    const next = prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    localStorage.setItem(DIET_PREFS_KEY, JSON.stringify(next))
    return next
  })
  const toggleAllergy = (id: string) => setAllergiesState(prev => {
    const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    saveAllergies(next)
    return next
  })

  const fieldLabel: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '3px' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <SubHeader title="Preferences" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 8px' }}>
        <SectionHeader label="MEASUREMENTS" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '10px', border: '1px solid var(--color-subtle)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={fieldLabel}>UNITS</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setUnits('imperial')} style={toggleStyle(units === 'imperial')}>Imperial</button>
                <button onClick={() => setUnits('metric')} style={toggleStyle(units === 'metric')}>Metric</button>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={fieldLabel}>TEMP</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setTemp('F')} style={toggleStyle(temp === 'F')}>°F</button>
                <button onClick={() => setTemp('C')} style={toggleStyle(temp === 'C')}>°C</button>
              </div>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>DEFAULT SERVINGS</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 4, 6].map(s => (
                <button key={s} onClick={() => setServings(s)} style={toggleStyle(servings === s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {isPro && (<>
        <SectionHeader label="DAILY CALORIE GOAL" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '12px', border: '1px solid var(--color-subtle)', marginBottom: '10px' }}>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '0 0 10px', lineHeight: 1.35 }}>
            Your target for Insights and the meal-plan nutrition bar.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setGoal(goal - 50)} aria-label="Lower goal" style={{ width: '40px', height: '40px', borderRadius: '11px', border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '20px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>−</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text)' }}>{goal.toLocaleString()}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '5px' }}>cal/day</span>
            </div>
            <button onClick={() => setGoal(goal + 50)} aria-label="Raise goal" style={{ width: '40px', height: '40px', borderRadius: '11px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '20px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>+</button>
          </div>
        </div>

        <SectionHeader label="DAILY MACROS" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '10px 12px', border: '1px solid var(--color-subtle)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {([
            { key: 'protein', label: 'Protein', color: '#a78bfa' },
            { key: 'carbs', label: 'Carbs', color: '#fbbf24' },
            { key: 'fat', label: 'Fat', color: 'var(--color-primary)' },
          ] as const).map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13.5px', color: 'var(--color-text)', fontWeight: '600' }}>{m.label}</span>
              <button onClick={() => setMacro(m.key, macros[m.key] - 5)} aria-label={`Lower ${m.label}`} style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '17px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>−</button>
              <span style={{ width: '48px', textAlign: 'center', fontSize: '15px', fontWeight: '800', color: 'var(--color-text)' }}>{macros[m.key]}g</span>
              <button onClick={() => setMacro(m.key, macros[m.key] + 5)} aria-label={`Raise ${m.label}`} style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '17px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>+</button>
            </div>
          ))}
        </div>
        </>)}

        <SectionHeader label="DIET" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '10px', border: '1px solid var(--color-subtle)', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DIET_OPTIONS.map(d => (
            <button key={d.id} onClick={() => toggleDiet(d.id)} style={pill(diet.includes(d.id), 'var(--color-primary)')}>{d.label}</button>
          ))}
        </div>

        <SectionHeader label="ALLERGIES" />
        <div style={{ background: 'var(--color-card)', borderRadius: '14px', padding: '10px', border: '1px solid var(--color-subtle)', marginBottom: '8px' }}>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '0 0 7px', lineHeight: 1.35 }}>
            Recipes with any of these are hidden across the app.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ALLERGY_OPTIONS.map(a => (
              <button key={a.id} onClick={() => toggleAllergy(a.id)} style={pill(allergies.includes(a.id), '#ef4444')}>{a.label}</button>
            ))}
          </div>
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
            <p ref={linkRef} style={{ flex: 1, fontSize: '14px', color: 'var(--color-primary)', fontWeight: '600', margin: 0, wordBreak: 'break-all', userSelect: 'all' }}>{link}</p>
            <button onClick={copyLink} aria-label="Copy link" title="Copy link" style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={16} color="var(--color-primary)" />
            </button>
          </div>
        </div>
        <button onClick={share} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
  const [isPro] = useProPlan()
  const [theme, setThemeState] = useState<Theme>(activeTheme())
  const chooseTheme = (t: Theme) => { setTheme(t); setThemeState(t) }

  if (subPage === 'account') return <AccountPage onBack={() => setSubPage(null)} />
  if (subPage === 'subscription') return <Subscription onBack={() => setSubPage(null)} />
  if (subPage === 'preferences') return <Preferences onBack={() => setSubPage(null)} />
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
          <Row
            icon={<Crown size={18} color="#f4b860" />}
            label="Subscription"
            value={isPro
              ? <span style={{ background: 'rgba(244,184,96,0.16)', color: '#f4b860', fontSize: '10px', fontWeight: '800', padding: '2.5px 7px', borderRadius: '999px', letterSpacing: '0.05em' }}>PRO</span>
              : 'Free'}
            onPress={() => setSubPage('subscription')}
          />
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
            <Row icon={<UserPlus size={18} color="var(--color-primary)" />} label="Invite friends" onPress={() => setSubPage('invite')} />
          </div>
        </div>

        <div style={{ margin: '0 16px 24px' }}>
          <button onClick={onSignOut} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(107,163,86,0.25)' }}>
            <LogOut size={17} />
            Log out
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>Version 1.0.0</p>

      </div>
    </div>
  )
}
