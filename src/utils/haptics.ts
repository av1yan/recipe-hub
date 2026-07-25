import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * A short tactile tap for gesture confirmations (long-press, swipe-to-remove).
 * Uses the native Taptic/haptic engine in the app, falls back to the Vibration
 * API on the web where it exists (Android Chrome), and is a silent no-op
 * elsewhere (iOS Safari ignores navigator.vibrate).
 */
export function tapHaptic(style: 'light' | 'medium' = 'light') {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
    return
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(style === 'medium' ? 16 : 10)
  }
}
