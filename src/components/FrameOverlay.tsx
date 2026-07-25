import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders its children into the `.phone-frame` element rather than wherever it
 * sits in the tree. A screen-level overlay (`position:absolute; inset:0`) only
 * covers the scrolling content area, so the persistent bottom nav pokes through
 * the bottom of it. Portalling to the frame — which wraps the content *and* the
 * nav and is itself `position:relative` — lets the same overlay cover the whole
 * device. Falls back to rendering in place if the frame isn't in the DOM yet.
 */
export function FrameOverlay({ children }: { children: ReactNode }) {
  const frame = typeof document !== 'undefined' ? document.querySelector('.phone-frame') : null
  return frame ? createPortal(children, frame) : <>{children}</>
}
