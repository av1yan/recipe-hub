import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Users, Crown, Plus, X, Check, Copy, Share2, RefreshCw, LogOut, Trash2 } from 'lucide-react'
import type { Screen } from '../types'
import { householdAPI } from '../utils/api'
import { useProPlan } from '../utils/proPlan'
import { Toast, useToast } from '../components/Toast'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

interface Member {
  id: string
  name: string
  avatar?: string | null
  role: string
  joinedAt: string
  isYou: boolean
}
interface Household {
  id: string
  name: string
  inviteCode: string
  members: Member[]
}
interface Item {
  id: string
  name: string
  checked: boolean
  addedByName?: string | null
}

// How often the shared list re-fetches while the screen is open, so a change
// made on another family member's phone shows up here.
const POLL_MS = 4000

export default function HouseholdScreen({ onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [household, setHousehold] = useState<Household | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [newItem, setNewItem] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast, show } = useToast()

  // Keep the latest household id available to the polling closure without
  // re-arming the interval on every render.
  const householdId = household?.id ?? null
  const idRef = useRef<string | null>(null)
  idRef.current = householdId

  useEffect(() => {
    if (isPro) loadHousehold()
    else setLoading(false)
  }, [])

  // Live sync: poll the shared list while we're in a household.
  useEffect(() => {
    if (!householdId) return
    const t = setInterval(() => {
      if (idRef.current) syncGrocery()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [householdId])

  async function loadHousehold() {
    try {
      setLoading(true)
      const res: any = await householdAPI.get()
      setHousehold(res?.household || null)
      if (res?.household) await syncGrocery()
    } catch {
      show('Could not load your family', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function syncGrocery() {
    try {
      const res: any = await householdAPI.grocery()
      setItems(Array.isArray(res?.items) ? res.items : [])
    } catch {
      /* a dropped poll is harmless — the next one recovers */
    }
  }

  // Refresh the roster (e.g. after someone new joins) without a full reload.
  async function refreshMembers() {
    try {
      const res: any = await householdAPI.get()
      if (res?.household) setHousehold(res.household)
    } catch { /* non-fatal */ }
  }

  async function createFamily() {
    if (busy) return
    setBusy(true)
    try {
      const res: any = await householdAPI.create(createName.trim() || undefined)
      setHousehold(res.household)
      setItems([])
      setCreateName('')
    } catch (e: any) {
      show(e?.message || 'Could not create the family', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function joinFamily() {
    const code = joinCode.trim()
    if (!code || busy) return
    setBusy(true)
    try {
      const res: any = await householdAPI.join(code)
      setHousehold(res.household)
      setJoinCode('')
      await syncGrocery()
    } catch (e: any) {
      show(e?.message || 'Could not join that family', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function leaveFamily() {
    if (!confirm('Leave this family? The shared list stays for everyone else.')) return
    setBusy(true)
    try {
      await householdAPI.leave()
      setHousehold(null)
      setItems([])
    } catch (e: any) {
      show(e?.message || 'Could not leave', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function regenerate() {
    if (!confirm('Make a new invite code? The old one stops working right away.')) return
    setBusy(true)
    try {
      const res: any = await householdAPI.regenerateCode()
      setHousehold(res.household)
      show('New invite code ready')
    } catch (e: any) {
      show(e?.message || 'Could not change the code', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!household) return
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      show('Invite code copied')
    } catch {
      show('Could not copy', 'error')
    }
  }

  async function shareCode() {
    if (!household) return
    const text = `Join our family "${household.name}" on recipHub — invite code ${household.inviteCode}`
    if (navigator.share) {
      try { await navigator.share({ title: 'recipHub family', text }) } catch { /* cancelled */ }
    } else {
      copyCode()
    }
  }

  async function addItem() {
    const name = newItem.trim()
    if (!name || busy) return
    setNewItem('')
    // Optimistic: show it immediately, then reconcile on the next sync.
    const temp: Item = { id: 'temp-' + Date.now(), name, checked: false, addedByName: 'You' }
    setItems(prev => [...prev, temp])
    try {
      await householdAPI.addItem({ name })
      await syncGrocery()
    } catch {
      setItems(prev => prev.filter(i => i.id !== temp.id))
      show('Could not add that', 'error')
    }
  }

  async function toggleItem(item: Item) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
    try {
      await householdAPI.updateItem(item.id, { checked: !item.checked })
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i))
    }
  }

  async function removeItem(item: Item) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    try {
      await householdAPI.removeItem(item.id)
    } catch {
      syncGrocery()
    }
  }

  async function clearChecked() {
    setItems(prev => prev.filter(i => !i.checked))
    try {
      await householdAPI.clearChecked()
    } catch {
      syncGrocery()
    }
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Family share &amp; sync</h1>
    </header>
  )

  if (!isPro) {
    return (
      <div className="screen">
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>A Pro feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
            Share one grocery list with your whole household — everyone adds to it and checks things off, live, from their own phone.
          </p>
          <button onClick={() => onNavigate('settings')} style={{ marginTop: '6px', padding: '13px 22px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
            <Crown size={16} color="#f4b860" /> Upgrade to Pro
          </button>
        </div>
      </div>
    )
  }

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="screen" style={{ background: 'var(--color-bg)', position: 'relative' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '32px 0' }}>Loading…</p>
        ) : !household ? (
          /* ---- Not in a family yet: create or join ---- */
          <>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Users size={28} color="var(--color-primary)" />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '300px', marginInline: 'auto' }}>
                Start a family to share one live grocery list — or join one with a code someone sent you.
              </p>
            </div>

            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 10px' }}>Start a family</h2>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="Family name (e.g. The Smiths)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }}
              />
              <button onClick={createFamily} disabled={busy} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                Create family
              </button>
            </div>

            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '16px', padding: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 10px' }}>Join a family</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') joinFamily() }}
                  placeholder="Invite code"
                  autoCapitalize="characters"
                  style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', letterSpacing: '0.12em', fontWeight: '700', color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={joinFamily} disabled={busy || !joinCode.trim()} style={{ flexShrink: 0, padding: '0 18px', borderRadius: '12px', border: 'none', background: joinCode.trim() ? 'var(--color-primary)' : 'var(--color-border)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: busy || !joinCode.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  Join
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ---- In a family ---- */
          <>
            {/* Family + invite code */}
            <div style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '18px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Users size={16} color="var(--color-primary)" />
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>{household.name}</h2>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
                {household.members.length} member{household.members.length === 1 ? '' : 's'}
              </p>

              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.06em', margin: '0 0 6px' }}>INVITE CODE</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ flex: 1, fontSize: '26px', fontWeight: '800', letterSpacing: '0.18em', color: 'var(--color-primary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {household.inviteCode}
                </span>
                <button onClick={copyCode} aria-label="Copy code" style={{ width: '40px', height: '40px', borderRadius: '11px', border: '1px solid var(--color-primary-border)', background: 'var(--color-card)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Copy size={17} />
                </button>
                <button onClick={shareCode} aria-label="Share code" style={{ width: '40px', height: '40px', borderRadius: '11px', border: 'none', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Share2 size={17} />
                </button>
              </div>
            </div>

            {/* Members */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: 0 }}>MEMBERS</p>
                <button onClick={refreshMembers} aria-label="Refresh members" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <RefreshCw size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {household.members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-subtle)' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '17px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                      {(m.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}{m.isYou ? ' (you)' : ''}
                    </span>
                    {m.role === 'owner' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '800', color: '#f4b860', background: 'rgba(244,184,96,0.16)', padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.04em' }}>
                        <Crown size={10} /> OWNER
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared grocery list */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: 0 }}>SHARED GROCERY LIST</p>
              {checkedCount > 0 && (
                <button onClick={clearChecked} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  <Trash2 size={12} /> Clear done ({checkedCount})
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                placeholder="Add to the shared list…"
                style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={addItem} aria-label="Add item" style={{ flexShrink: 0, width: '46px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Plus size={20} />
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '30px', marginBottom: '6px' }}>🛒</div>
                <p style={{ fontSize: '13px', margin: 0 }}>The list is empty. Add something — everyone in the family will see it.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-subtle)' }}>
                    <button
                      onClick={() => toggleItem(item)}
                      aria-label={item.checked ? 'Uncheck' : 'Check'}
                      style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '7px', border: '1.5px solid ' + (item.checked ? 'var(--color-primary)' : 'var(--color-border)'), background: item.checked ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                    >
                      {item.checked && <Check size={15} color="#fff" />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: item.checked ? 'var(--color-text-muted)' : 'var(--color-text)', margin: 0, textDecoration: item.checked ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </p>
                      {item.addedByName && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '1px 0 0' }}>added by {item.addedByName}</p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item)} aria-label={`Remove ${item.name}`} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', color: 'var(--color-text-muted)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Owner tools + leave */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-subtle)' }}>
              {household.members.find(m => m.isYou)?.role === 'owner' && (
                <button onClick={regenerate} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <RefreshCw size={15} /> New invite code
                </button>
              )}
              <button onClick={leaveFamily} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '12px', border: '1px solid var(--color-error-border, #f0c8c8)', background: 'var(--color-error-bg)', color: '#ef4444', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                <LogOut size={15} /> Leave family
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="24px" />}
    </div>
  )
}
