import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Copy text to the clipboard. Prefers the async Clipboard API, but falls back to
 * the legacy execCommand path for environments where the async API is blocked
 * (document not focused, restrictive permissions policy, older browsers). The
 * fallback runs from inside the click handler, which is where sharing is called.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch {
      // Async API refused (NotAllowedError etc.) — try the legacy path below.
    }
  }
  return legacyCopy(text)
}

// Deprecated but broadly supported: drop a hidden textarea, select it, and run
// the copy command. Restores any prior selection so it's invisible to the user.
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const selection = document.getSelection()
  const saved = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-9999px'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  let ok = false
  try {
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  if (saved && selection) { selection.removeAllRanges(); selection.addRange(saved) }
  return ok
}

/**
 * Share text via the native share sheet when it exists (phones), otherwise copy
 * it to the clipboard. Returns what happened so the caller can toast honestly.
 * A share sheet the person dismisses counts as done, not an error.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  // Native app: the real OS share sheet.
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text })
      return 'shared'
    } catch (err) {
      // Dismissing the sheet isn't an error — count it as done, don't then copy.
      if (/cancel/i.test((err as { message?: string })?.message ?? '')) return 'shared'
      // Any real failure falls through to the clipboard path below.
    }
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.share) {
    try {
      await nav.share({ title, text })
      return 'shared'
    } catch (err) {
      // AbortError = the person closed the sheet on purpose; don't fall back.
      if ((err as { name?: string })?.name === 'AbortError') return 'shared'
      // Anything else (unsupported payload, permission) falls through to copy.
    }
  }
  return (await copyToClipboard(text)) ? 'copied' : 'failed'
}
