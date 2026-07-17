import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { Screen, Cookbook } from '../types'
import { cookbookAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
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
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>My Cookbooks</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Loading cookbooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
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
                style={{ flex: 1, background: '#e2e8f0', color: '#1e293b' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '16px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {cookbooks.map((cookbook, index) => (
              <div
                key={cookbook.id}
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#fff',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    height: '100px',
                    background: getColorForCookbook(index),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    position: 'relative',
                  }}
                >
                  📖
                  <button
                    onClick={() => { setConfirmId(cookbook.id); setError('') }}
                    aria-label={`Delete ${cookbook.name}`}
                    style={{
                      position: 'absolute', top: '6px', right: '6px',
                      width: '28px', height: '28px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.9)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} color="#64748b" />
                  </button>
                </div>
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {cookbook.name}
                  </div>
                  {cookbook.description && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', lineHeight: '1.4' }}>
                      {cookbook.description.length > 60 ? cookbook.description.slice(0, 60) + '…' : cookbook.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 'auto' }}>
                    {cookbook.recipes?.length || 0} recipes
                  </div>

                  {confirmId === cookbook.id && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', lineHeight: 1.45 }}>
                        Delete this cookbook? The recipes in it stay.
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{ flex: 1, padding: '7px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => deleteCookbook(cookbook.id)}
                          disabled={deleting}
                          style={{ flex: 1, padding: '7px', borderRadius: '8px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}
                        >
                          {deleting ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
