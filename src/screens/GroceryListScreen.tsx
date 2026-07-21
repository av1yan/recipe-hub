import { useState, useEffect, useRef } from 'react'
import { Trash2, Plus, Check, Camera, Image as ImageIcon, Share2, Loader2, X, CalendarDays } from 'lucide-react'
import type { Screen, GroceryList, GroceryItem } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { groceryAPI, mealPlanAPI } from '../utils/api'
import { DAY_NAMES, MEALS, getMeals, sameWeek } from './MealPlanScreen'
import { toGroceryLine, pluralizeUnit } from '../utils/grocery'
import { Toast, useToast } from '../components/Toast'
import { useProPlan } from '../utils/proPlan'
import { shareText } from '../utils/share'

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
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { toast, show } = useToast()
  const [isPro] = useProPlan()
  const [generating, setGenerating] = useState(false)

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
  // Both the header "Scan" and the empty-state button open a small chooser so
  // the person can snap a fresh photo or pick an existing one, matching the
  // recipe photo import.
  const openCamera = () => setPickerOpen(true)

  // Pro feature: share the current list as text — native share sheet on a
  // phone, clipboard on desktop.
  async function shareList() {
    if (!isPro) { show('Sharing your list is a Pro feature — upgrade in Settings.', 'error'); return }
    const list = lists.find(l => l.id === selectedListId)
    const items = list?.items || []
    if (items.length === 0) { show('Nothing to share yet.', 'error'); return }
    const lines = [
      `🛒 ${list?.name || 'Grocery list'}`,
      '',
      ...items.map(i => `${i.checked ? '✓' : '•'} ${i.name}${(i.unit || '').trim() ? ` — ${i.quantity} ${pluralizeUnit(i.unit, i.quantity)}` : ''}`),
    ]
    const res = await shareText('My grocery list', lines.join('\n'))
    if (res === 'failed') show('Could not share the list', 'error')
    else show(res === 'copied' ? 'List copied to clipboard' : 'List shared')
  }

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

  // Pro: pull every ingredient from this week's planned meals into the grocery
  // list (the backend merges repeats by name+unit). Same logic the Meal Plan
  // screen uses, offered here from where you read the list.
  async function generateFromPlan() {
    if (generating) return
    if (!isPro) { show('Building the list from your plan is a Pro feature — upgrade in Settings.', 'error'); return }
    setGenerating(true)
    try {
      const plans: any = await mealPlanAPI.list()
      const plan = (Array.isArray(plans) ? plans : []).find((p: any) => sameWeek(p.weekStart, new Date()))
      if (!plan?.id) { show('Plan some meals this week first.', 'error'); return }
      const full: any = await mealPlanAPI.get(plan.id)
      const ingredients: any[] = []
      DAY_NAMES.forEach(day => MEALS.forEach(m => {
        getMeals(full, day, m.key).forEach((meal: any) => {
          (meal.ingredients || []).forEach((ing: any) => ingredients.push(ing))
        })
      }))
      // Normalize recipe measures into shopping-friendly lines (buy the item, not
      // "3 tbsp"). The backend then merges repeats by name+unit.
      const lines = ingredients.map(toGroceryLine).filter(l => l.name)
      if (lines.length === 0) { show('No ingredients in this week’s plan yet.', 'error'); return }

      let list: any = lists.find(l => l.id === selectedListId)
      if (!list?.id) { const gl: any = await groceryAPI.list(); list = Array.isArray(gl) ? gl[0] : gl }
      if (!list?.id) list = await groceryAPI.create('Groceries')
      await Promise.all(lines.map(l => groceryAPI.addItem(list.id, l)))
      const unique = new Set(lines.map(l => `${l.name.toLowerCase()}|${l.unit.toLowerCase()}`)).size
      await loadLists()
      setSelectedListId(list.id)
      show(`Added ${unique} ingredient${unique === 1 ? '' : 's'} from your plan`)
    } catch {
      show('Could not build your grocery list', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const selectedList = lists.find(l => l.id === selectedListId)
  const checkedCount = selectedList?.items?.filter(i => i.checked).length || 0
  const totalCount = selectedList?.items?.length || 0

  const hiddenFileInputs = (
    <>
      {/* Camera: capture="environment" opens the rear camera on phones. */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
      {/* Library: no capture attr, so this picks an existing photo/file. */}
      <input ref={libraryRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
    </>
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
      {hiddenFileInputs}

      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedList ? '12px' : 0 }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isPro && selectedList && (
              <button
                onClick={generateFromPlan}
                disabled={generating}
                aria-label="Generate from this week's plan"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', fontWeight: '700', cursor: generating ? 'default' : 'pointer' }}
              >
                <CalendarDays size={15} /> {generating ? '…' : 'From plan'}
              </button>
            )}
            {isPro && selectedList && (selectedList.items?.length || 0) > 0 && (
              <button
                onClick={shareList}
                aria-label="Share grocery list"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                <Share2 size={15} /> Share
              </button>
            )}
            <button
              onClick={openCamera}
              aria-label="Scan a grocery note"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary-border)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              <Camera size={16} /> Scan
            </button>
          </div>
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
              <button onClick={createNewList} className="btn" style={{ width: '100%', background: 'var(--color-primary)', color: '#fff' }}>
                Create List
              </button>
              <button
                onClick={openCamera}
                className="btn"
                style={{ width: '100%', background: 'var(--color-card)', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary-border)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={16} /> Scan a note
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Only a switcher when there's something to switch to. It also
                needs flex-shrink: 0 -- overflow-x makes it a scroll container,
                which otherwise collapses to its padding inside the scrolling
                column (it rendered as a thin green sliver). */}
            {lists.length > 1 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', flexShrink: 0 }}>
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: list.id === selectedListId ? 'var(--color-primary)' : 'var(--color-subtle)',
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
            )}

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
                      style={{ background: 'var(--color-primary)', color: '#fff', width: '40px', height: '40px', padding: '8px' }}
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
                            border: `2px solid ${item.checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: item.checked ? 'var(--color-primary)' : 'transparent',
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
                          {(item.unit || '').trim() && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                              {item.quantity} {pluralizeUnit(item.unit, item.quantity)}
                            </div>
                          )}
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
                    <div style={{ textAlign: 'center', padding: '28px 0' }}>
                      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 16px' }}>No items in this list</p>
                      {isPro && (
                        <button
                          onClick={generateFromPlan}
                          disabled={generating}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >
                          <CalendarDays size={16} /> {generating ? 'Building…' : 'Generate from this week’s plan'}
                        </button>
                      )}
                    </div>
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
          <Loader2 size={40} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '15px', color: 'var(--color-text)', fontWeight: '600', margin: 0 }}>Reading your note…</p>
          <div style={{ width: '200px', height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-primary)', width: `${Math.round(scanProgress * 100)}%`, transition: 'width 0.2s' }} />
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
              style={{ flex: 2, padding: '13px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: savingScan || scanned.length === 0 ? 0.6 : 1 }}
            >
              {savingScan ? 'Adding…' : `Add ${scanned.length} item${scanned.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {/* Scan source chooser — camera or existing photo. */}
      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(15,23,42,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-card)', borderTopLeftRadius: '18px', borderTopRightRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Scan a grocery note</p>
            <button
              onClick={() => { setPickerOpen(false); cameraRef.current?.click() }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Camera size={17} /> Take a photo
            </button>
            <button
              onClick={() => { setPickerOpen(false); libraryRef.current?.click() }}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ImageIcon size={17} /> Choose from library
            </button>
            <button
              onClick={() => setPickerOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
