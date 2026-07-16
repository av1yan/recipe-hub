import { useState, useEffect } from 'react'
import { Trash2, Plus, Check } from 'lucide-react'
import type { Screen, GroceryList, GroceryItem } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { groceryAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function GroceryListScreen({ onNavigate }: Props) {
  const [lists, setLists] = useState<GroceryList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('piece')

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
          ? { ...list, items: [...(list.items || []), item] }
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

  const selectedList = lists.find(l => l.id === selectedListId)
  const checkedCount = selectedList?.items?.filter(i => i.checked).length || 0
  const totalCount = selectedList?.items?.length || 0

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Loading...</p>
        </div>
        <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Grocery List</h2>
        </div>
        {selectedList && (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            {checkedCount} of {totalCount} items checked
          </div>
        )}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {lists.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: '16px' }}>
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
              <button onClick={createNewList} className="btn" style={{ width: '100%', background: '#c67139', color: '#fff' }}>
                Create List
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
                    background: list.id === selectedListId ? '#c67139' : '#f1f5f9',
                    color: list.id === selectedListId ? '#fff' : '#1e293b',
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
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
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
                      style={{ background: '#c67139', color: '#fff', width: '40px', height: '40px', padding: '8px' }}
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
                          padding: '12px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          opacity: item.checked ? 0.6 : 1,
                        }}
                      >
                        <button
                          onClick={() => toggleItem(item.id, item.checked || false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${item.checked ? '#7a8a5e' : '#cbd5e1'}`,
                            background: item.checked ? '#7a8a5e' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {item.checked && <Check size={14} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', textDecoration: item.checked ? 'line-through' : 'none' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="btn btn-icon"
                          style={{ background: 'transparent', color: '#ef4444', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '24px 0' }}>No items in this list</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNavigation active="grocery" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
