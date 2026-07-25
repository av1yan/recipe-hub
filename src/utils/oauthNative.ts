import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import { oauthStartUrl } from './api'

export type NativeOAuthResult =
  | { token: string }
  | { error: string }
  | { cancelled: true }

// The custom scheme the backend redirects the finished sign-in to. The app
// registers it (iOS CFBundleURLTypes, Android intent-filter) and catches the
// return here; it is only ever used for OAuth, so any hit is ours.
const RETURN_SCHEME = 'com.reciphub.app://'

/**
 * Google (and Apple) refuse to render their consent screen inside an embedded
 * WebView, so on a native build we hand the whole flow to the system browser
 * and wait for the backend to bounce the result back through our custom-scheme
 * deep link. Resolves with our app JWT, a readable error, or a plain cancel.
 *
 * The web build uses a full-page redirect instead (see OAuthButton); this path
 * only makes sense where a system browser and deep link exist.
 */
export function signInWithProviderNative(provider: string): Promise<NativeOAuthResult> {
  return new Promise((resolve) => {
    let settled = false
    let urlSub: PluginListenerHandle | undefined
    let closeSub: PluginListenerHandle | undefined

    const finish = (result: NativeOAuthResult) => {
      if (settled) return
      settled = true
      urlSub?.remove()
      closeSub?.remove()
      // Dismiss the system browser; harmless if it has already gone away.
      Browser.close().catch(() => {})
      resolve(result)
    }

    void (async () => {
      urlSub = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith(RETURN_SCHEME)) return
        const params = new URLSearchParams(url.split('#')[1] || '')
        const token = params.get('token')
        if (token) finish({ token })
        else finish({ error: params.get('oauth_error') || 'Sign-in failed' })
      })

      // Fired when the person swipes the browser away before finishing. Our own
      // Browser.close() in finish() also fires it, but settled is already true
      // by then, so the cancel is ignored on the success path.
      closeSub = await Browser.addListener('browserFinished', () => finish({ cancelled: true }))

      try {
        // return=app tells the backend to redirect to our deep link, not the site.
        await Browser.open({ url: `${oauthStartUrl(provider)}?return=app` })
      } catch {
        finish({ error: 'Could not open the browser' })
      }
    })()
  })
}
