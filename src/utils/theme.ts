import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export type Theme = 'light' | 'dark'

const KEY = 'theme'

/** The person's saved choice, or null to follow the system. */
export function storedTheme(): Theme | null {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : null
}

export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** What the UI is actually showing right now. */
export function activeTheme(): Theme {
  return storedTheme() ?? systemTheme()
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // Keep the native status-bar icons legible against the app background: light
  // icons (Style.Dark) on the dark theme, dark icons (Style.Light) on light.
  // No-op on the web build.
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
  }
}

/** Called once at startup, before the app paints, so there's no light flash. */
export function initTheme() {
  apply(activeTheme())
  // If the person hasn't chosen, keep following the system as it changes.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (!storedTheme()) apply(systemTheme())
  })
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  apply(theme)
}
