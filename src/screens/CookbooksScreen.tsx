import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { Screen, Cookbook } from '../types'
import { cookbookAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
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

  const getColorForCookbook = (index: number): string => {
    const colors = ['#c67139', '#6ba356', '#d4a574', '#b8956a', '#a48a6e']
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>My Cookbooks</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <p>Loading cookbooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>My Cookbooks</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-icon"
          style={{ background: 'transparent', color: '#c67139' }}
        >
          <Plus size={22} />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {showCreateForm && (
          <div style={{ background: 'var(--color-bg)', borderRadius: '12px', padding: '16px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
            <input
              type="text"
              value={newCookbookName}
              onChange={(e) => setNewCookbookName(e.target.value)}
              placeholder="Cookbook name..."
              className="input"
              style={{ marginBottom: '8px' }}
            />
            <textarea
              value={newCookbookDesc}
              onChange={(e) => setNewCookbookDesc(e.target.value)}
              placeholder="Description (optional)..."
              className="input"
              style={{ minHeight: '80px', marginBottom: '8px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={createCookbook}
                className="btn"
                style={{ flex: 1, background: '#c67139', color: '#fff' }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewCookbookName('')
                  setNewCookbookDesc('')
                }}
                className="btn"
                style={{ flex: 1, background: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>{error}</p>
          </div>
        )}

        {cookbooks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: '16px' }}>
            <p>No cookbooks yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn"
              style={{ background: '#c67139', color: '#fff' }}
            >
              Create Your First Cookbook
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cookbooks.map((cookbook, index) => {
              const tint = getColorForCookbook(index)
              const count = cookbook.recipes?.length || 0
              return (
                <div
                  key={cookbook.id}
                  style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-subtle)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    onClick={() => confirmId !== cookbook.id && onNavigate('cookbook', { cookbookId: cookbook.id })}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer' }}
                  >
                    {/* Small tinted book tile, matching the Home cookbook cards. */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                      📖
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cookbook.name}
                      </h3>
                      {cookbook.description && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cookbook.description}
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        {count} recipe{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(cookbook.id); setError('') }}
                      aria-label={`Delete ${cookbook.name}`}
                      style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px', background: 'var(--color-subtle)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} color="var(--color-text-muted)" />
                    </button>
                  </div>

                  {confirmId === cookbook.id && (
                    <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--color-subtle)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '10px 0 8px', lineHeight: 1.45 }}>
                        Delete this cookbook? The recipes in it stay.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => deleteCookbook(cookbook.id)}
                          disabled={deleting}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}
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
