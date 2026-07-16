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
                  }}
                >
                  📖
                </div>
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {cookbook.name}
                  </div>
                  {cookbook.description && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', lineHeight: '1.4' }}>
                      {cookbook.description.substring(0, 60)}...
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 'auto' }}>
                    {cookbook.recipes?.length || 0} recipes
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
