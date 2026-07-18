import { useState, useEffect, useRef } from 'react'
import { Trash2, Plus, Check, Camera, Loader2, X } from 'lucide-react'
import type { Screen, GroceryList, GroceryItem } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { groceryAPI } from '../utils/api'
import { Toast, useToast } from '../components/Toast'

interface Props {
  onNavigate: (screen: Screen) => void
}

const UNITS = [
  'lb', 'lbs', 'oz', 'kg', 'g', 'gram', 'grams', 'cup', 'cups', 'tbsp', 'tsp',
  'ml', 'l', 'liter', 'litre', 'dozen', 'doz', 'pack', 'packs', 'bunch', 'bunches',
  'can', 'cans', 'box', 'boxes', 'bag', 'bags', 'bottle', 'bottles', 'jar', 'jars',
]

// Strip bullets, checkboxes and list numbering that show up on handwritten/printed notes.
function cleanLine(l: string): string {
  return l
    .replace(/^\s*[-*•·◦+□☐☑✓]+\s*/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// The backend folds a repeat add into an existing line, so it may return an
// item we already have (same id, new quantity). Replace it in place rather than
// appending, which would otherwise show a duplicate until the next reload.
function upsertItem(items: GroceryItem[], item: GroceryItem): GroceryItem[] {
  const idx = items.findIndex(i => i.id === item.id)
  if (idx === -1) return [...items, item]
  const next = items.slice()
  next[idx] = item
  return next
}

function parseGroceryLines(text: string): string[] {
  return text
    .split('\n')
    .map(cleanLine)
    .filter(l => l.length >= 2 && /[a-zA-Z]/.test(l))
    .slice(0, 50)
}

// Common OCR misreads of unit abbreviations (l↔I↔1, o↔0).
const UNIT_ALIASES: Record<string, string> = {
  ib: 'lb', '1b': 'lb', lbs: 'lb', ozs: 'oz', '0z': 'oz', gr: 'g', kgs: 'kg', ltr: 'l',
}

function normalizeUnit(u: string): string | null {
  const low = u.toLowerCase()
  if (UNIT_ALIASES[low]) return UNIT_ALIASES[low]
  if (UNITS.includes(low)) return low
  return null
}

// Pull a leading quantity + unit out of a line, e.g. "2 lb apples" -> {apples, 2, lb}.
function parseItemParts(raw: string): { name: string; quantity: number; unit: string } {
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/)
  if (m) {
    const qty = parseFloat(m[1]) || 1
    const unit = m[2] ? normalizeUnit(m[2]) : null
    if (unit) return { name: m[3].trim(), quantity: qty, unit }
    // number but no recognized unit -> keep the word as part of the name ("3 apples")
    return { name: (m[2] ? m[2] + ' ' : '') + m[3].trim(), quantity: qty, unit: 'piece' }
  }
  return { name: raw.trim(), quantity: 1, unit: 'piece' }
}

export default function GroceryListScreen({ onNavigate }: Props) {
  const [lists, setLists] = useState<GroceryList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('piece')

  // Photo-scan state
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanned, setScanned] = useState<string[] | null>(null)
  const [savingScan, setSavingScan] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast, show } = useToast()

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    try {
      setIsLoading(true)
      const data = await groceryAPI.list()
      setLists(data)
      if (data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load grocery lists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createNewList() {
    if (!newListName.trim()) return
    try {
      const list = await groceryAPI.create(newListName)
      setLists([...lists, list])
      setSelectedListId(list.id)
      setNewListName('')
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  async function addItemToList() {
    if (!selectedListId || !newItemName.trim()) return
    try {
      const item = await groceryAPI.addItem(selectedListId, {
        name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        category: 'general',
      })
      setLists(lists.map(list =>
        list.id === selectedListId
          ? { ...list, items: upsertItem(list.items || [], item) }
          : list
      ))
      setNewItemName('')
      setNewItemQuantity('1')
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  async function toggleItem(itemId: string, currentChecked: boolean) {
    try {
      await groceryAPI.updateItem(itemId, !currentChecked)
      setLists(lists.map(list =>
        list.id === selectedListId
          ? {
              ...list,
              items: list.items?.map(item =>
                item.id === itemId ? { ...item, checked: !currentChecked } : item
              ) || [],
            }
          : list
      ))
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await groceryAPI.removeItem(itemId)
      setLists(lists.map(list =>
        list.id === selectedListId
          ? { ...list, items: list.items?.filter(item => item.id !== itemId) || [] }
          : list
      ))
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  // ─── Photo scan ────────────────────────────────────────────────────────────
  const openCamera = () => fileInputRef.current?.click()

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setScanning(true)
    setScanProgress(0)
    try {
      const Tesseract = (await import('tesseract.js')).default
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m: { progress?: number }) => {
          if (typeof m.progress === 'number') setScanProgress(m.progress)
        },
      })
      const lines = parseGroceryLines(data.text || '')
      if (lines.length === 0) {
        show('No items found — try a clearer photo', 'error')
      } else {
        setScanned(lines)
      }
    } catch (err) {
      console.error('OCR failed:', err)
      show('Could not read the photo', 'error')
    } finally {
      setScanning(false)
    }
  }

  const updateScanned = (i: number, v: string) =>
    setScanned(prev => (prev ? prev.map((x, idx) => (idx === i ? v : x)) : prev))
  const removeScanned = (i: number) =>
    setScanned(prev => (prev ? prev.filter((_, idx) => idx !== i) : prev))

  async function addScannedItems() {
    const items = (scanned || []).map(s => s.trim()).filter(Boolean)
    if (items.length === 0) { setScanned(null); return }
    setSavingScan(true)
    try {
      let listId = selectedListId
      if (!listId) {
        const list = await groceryAPI.create(newListName.trim() || 'Scanned List')
        setLists(prev => [...prev, list])
        setSelectedListId(list.id)
        setNewListName('')
        listId = list.id
      }
      let working: GroceryItem[] = lists.find(l => l.id === listId)?.items || []
      for (const raw of items) {
        const { name, quantity, unit } = parseItemParts(raw)
        const item = await groceryAPI.addItem(listId, { name, quantity, unit, category: 'general' })
        working = upsertItem(working, item)
      }
      const finalItems = working
      setLists(prev => prev.map(l => (l.id === listId ? { ...l, items: finalItems } : l)))
      setScanned(null)
      show(`Added ${items.length} item${items.length === 1 ? '' : 's'}`)
    } catch (err) {
      console.error('Failed to add scanned items:', err)
      show('Could not save items', 'error')
    } finally {
      setSavingScan(false)
    }
  }

  const selectedList = lists.find(l => l.id === selectedListId)
  const checkedCount = selectedList?.items?.filter(i => i.checked).length || 0
  const totalCount = selectedList?.items?.length || 0

  const hiddenFileInput = (
    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
  )

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <p>Loading...</p>
        </div>
        <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ position: 'relative' }}>
      {hiddenFileInput}

      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedList ? '12px' : 0 }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
          <button
            onClick={openCamera}
            aria-label="Scan a grocery note"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-bg)', color: '#6ba356', border: '1.5px solid var(--color-primary-border)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Camera size={16} /> Scan
          </button>
        </div>
        {selectedList && (
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {checkedCount} of {totalCount} items checked
          </div>
        )}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {lists.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-muted)', gap: '16px' }}>
            <p style={{ marginBottom: 0 }}>No grocery lists yet</p>
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNewList()}
                placeholder="Create a new list..."
                className="input"
                style={{ marginBottom: '8px' }}
              />
              <button onClick={createNewList} className="btn" style={{ width: '100%', background: '#6ba356', color: '#fff' }}>
                Create List
              </button>
              <button
                onClick={openCamera}
                className="btn"
                style={{ width: '100%', background: 'var(--color-card)', color: '#6ba356', border: '1.5px solid var(--color-primary-border)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={16} /> Scan a note
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {lists.map(list => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: list.id === selectedListId ? '#6ba356' : 'var(--color-subtle)',
                    color: list.id === selectedListId ? '#fff' : 'var(--color-text)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {list.name}
                </button>
              ))}
            </div>

            {selectedList && (
              <>
                <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-bg)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItemToList()}
                      placeholder="Item name..."
                      className="input"
                      style={{ flex: 1, fontSize: '14px' }}
                    />
                    <input
                      type="number"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="Qty"
                      className="input"
                      style={{ width: '60px', fontSize: '14px' }}
                    />
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="input"
                      style={{ width: '80px', fontSize: '14px' }}
                    >
                      <option>piece</option>
                      <option>lb</option>
                      <option>oz</option>
                      <option>kg</option>
                      <option>g</option>
                      <option>cup</option>
                      <option>tbsp</option>
                      <option>tsp</option>
                      <option>ml</option>
                      <option>l</option>
                    </select>
                    <button
                      onClick={addItemToList}
                      className="btn btn-icon"
                      style={{ background: '#6ba356', color: '#fff', width: '40px', height: '40px', padding: '8px' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedList.items && selectedList.items.length > 0 ? (
                    selectedList.items.map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          background: 'var(--color-card)',
                          borderRadius: '14px',
                          border: '1px solid var(--color-subtle)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          opacity: item.checked ? 0.6 : 1,
                        }}
                      >
                        <button
                          onClick={() => toggleItem(item.id, item.checked || false)}
                          aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            flexShrink: 0,
                            border: `2px solid ${item.checked ? '#6ba356' : 'var(--color-border)'}`,
                            background: item.checked ? '#6ba356' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {item.checked && <Check size={14} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', textDecoration: item.checked ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          aria-label={`Delete ${item.name}`}
                          style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px', background: 'var(--color-subtle)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: '24px 0' }}>No items in this list</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Scanning overlay */}
      {scanning && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.96)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
          <Loader2 size={40} color="#6ba356" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '15px', color: 'var(--color-text)', fontWeight: '600', margin: 0 }}>Reading your note…</p>
          <div style={{ width: '200px', height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#6ba356', width: `${Math.round(scanProgress * 100)}%`, transition: 'width 0.2s' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>{Math.round(scanProgress * 100)}%</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Review overlay */}
      {scanned && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-card)', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setScanned(null)} aria-label="Cancel scan" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <X size={22} color="var(--color-text)" />
            </button>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Review items</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Edit or remove any misreads, then add.</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scanned.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={item}
                  onChange={e => updateScanned(i, e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', fontSize: '14px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <button onClick={() => removeScanned(i)} aria-label="Remove item" style={{ flexShrink: 0, width: '36px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-card)', border: '1.5px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>
            ))}
            {scanned.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '24px' }}>No items — cancel and try again.</p>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-subtle)', display: 'flex', gap: '10px' }}>
            <button onClick={() => setScanned(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={addScannedItems}
              disabled={savingScan || scanned.length === 0}
              style={{ flex: 2, padding: '13px', borderRadius: '12px', background: '#6ba356', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: savingScan || scanned.length === 0 ? 0.6 : 1 }}
            >
              {savingScan ? 'Adding…' : `Add ${scanned.length} item${scanned.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
