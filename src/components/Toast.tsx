import { useState, useRef } from 'react'
import { Check } from 'lucide-react'

// Floating confirmation pill, anchored to the bottom of the nearest positioned ancestor.
export function Toast({ message, tone, bottom = '28px' }: { message: string; tone: 'success' | 'error'; bottom?: string }) {
  return (
    <div style={{ position: 'absolute', bottom, left: '16px', right: '16px', display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}>
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
export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const show = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }
  return { toast, show }
}
