import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { Screen, Cookbook } from '../types'
import { cookbookAPI } from '../utils/api'
import { useProPlan, FREE_COOKBOOK_LIMIT } from '../utils/proPlan'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const fieldStyle = {
  width: '100%', padding: '11px 13px', borderRadius: '11px', border: 'none',
  background: 'var(--color-subtle)', color: 'var(--color-text)',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
}

export default function CookbooksScreen({ onNavigate }: Props) {
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCookbookName, setNewCookbookName] = useState('')
  const [newCookbookDesc, setNewCookbookDesc] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  // Which cookbook is asking to be confirmed. Inline, not a popup.
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [isPro] = useProPlan()

  useEffect(() => {
    loadCookbooks()
  }, [])

  async function loadCookbooks() {
    try {
      setIsLoading(true)
      const data = await cookbookAPI.list()
      setCookbooks(data)
    } catch (error) {
      console.error('Failed to load cookbooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createCookbook() {
    if (!newCookbookName.trim()) return
    if (!isPro && cookbooks.length >= FREE_COOKBOOK_LIMIT) {
      setError(`The Free plan is capped at ${FREE_COOKBOOK_LIMIT} cookbook. Upgrade to Pro in Settings for unlimited.`)
      return
    }
    try {
      const cookbook = await cookbookAPI.create(newCookbookName, newCookbookDesc || undefined)
      setCookbooks([...cookbooks, cookbook])
      setNewCookbookName('')
      setNewCookbookDesc('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create cookbook:', error)
    }
  }

  async function deleteCookbook(id: string) {
    setError('')
    setDeleting(true)
    try {
      await cookbookAPI.delete(id)
      setCookbooks(prev => prev.filter(c => c.id !== id))
      setConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that cookbook')
    } finally {
      setDeleting(false)
    }
  }

  const header = (
    <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ flex: 1, fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', margin: 0, color: 'var(--color-text)' }}>My Cookbooks</h1>
      <button
        onClick={() => {
          if (!isPro && !showCreateForm && cookbooks.length >= FREE_COOKBOOK_LIMIT) {
            setError(`The Free plan is capped at ${FREE_COOKBOOK_LIMIT} cookbook. Upgrade to Pro in Settings for unlimited.`)
            return
          }
          setError('')
          setShowCreateForm(!showCreateForm)
        }}
        aria-label="New cookbook"
        style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--color-subtle)', color: 'var(--color-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus size={20} />
      </button>
    </header>
  )

  if (isLoading) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ padding: '16px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
              <div className="rh-skel" style={{ width: '45%', height: '14px', borderRadius: '7px' }} />
              <div className="rh-skel" style={{ width: '25%', height: '11px', borderRadius: '6px', marginTop: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {showCreateForm && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={newCookbookName}
              onChange={(e) => setNewCookbookName(e.target.value)}
              placeholder="Cookbook name…"
              style={fieldStyle}
            />
            <textarea
              value={newCookbookDesc}
              onChange={(e) => setNewCookbookDesc(e.target.value)}
              placeholder="Description (optional)…"
              style={{ ...fieldStyle, minHeight: '76px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={createCookbook} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Create
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewCookbookName(''); setNewCookbookDesc('') }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--color-error-bg)', borderRadius: '12px', padding: '11px 13px', marginBottom: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{error}</p>
          </div>
        )}

        {cookbooks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '64px', color: 'var(--color-text-muted)', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '15px' }}>No cookbooks yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{ padding: '12px 20px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Create your first cookbook
            </button>
          </div>
        ) : (
          <div>
            {cookbooks.map((cookbook, index) => {
              const count = cookbook.recipes?.length || 0
              return (
                <div key={cookbook.id} style={{ borderTop: index > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                  <div
                    onClick={() => confirmId !== cookbook.id && onNavigate('cookbook', { cookbookId: cookbook.id })}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 0', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cookbook.name}
                      </h3>
                      {cookbook.description && (
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cookbook.description}
                        </p>
                      )}
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                        {count} recipe{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(cookbook.id); setError('') }}
                      aria-label={`Delete ${cookbook.name}`}
                      style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '15px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} color="var(--color-text-muted)" />
                    </button>
                  </div>

                  {confirmId === cookbook.id && (
                    <div style={{ padding: '0 0 14px' }}>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.45 }}>
                        Delete this cookbook? The recipes in it stay.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{ flex: 1, padding: '9px', borderRadius: '10px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => deleteCookbook(cookbook.id)}
                          disabled={deleting}
                          style={{ flex: 1, padding: '9px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}
                        >
                          {deleting ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
