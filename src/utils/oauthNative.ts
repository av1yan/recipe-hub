import { InAppBrowser } from '@capgo/capacitor-inappbrowser'
import { oauthStartUrl } from './api'

export type NativeOAuthResult =
  | { token: string }
  | { error: string }
  | { cancelled: true }

// The custom scheme the backend redirects the finished sign-in to. The app
// registers it (iOS CFBundleURLTypes, Android intent-filter); the auth session
// below catches it directly, so it is only ever used for OAuth.
const RETURN_URI = 'com.reciphub.app://oauth'

/**
 * Google (and Apple) refuse to render their consent screen inside an embedded
 * WebView, so on a native build we run the flow in ASWebAuthenticationSession
 * (iOS) via openSecureWindow. Unlike a plain in-app browser sheet, it hands the
 * custom-scheme redirect back to us directly, so the sign-in completes without
 * the sheet getting stuck. Resolves with our app JWT, a readable error, or a
 * plain cancel.
 *
 * The web build uses a full-page redirect instead (see OAuthButton).
 */
export async function signInWithProviderNative(provider: string): Promise<NativeOAuthResult> {
  try {
    // return=app tells the backend to redirect to our deep link, not the site.
    const { redirectedUri } = await InAppBrowser.openSecureWindow({
      authEndpoint: `${oauthStartUrl(provider)}?return=app`,
      redirectUri: RETURN_URI,
    })
    const params = new URLSearchParams(redirectedUri.split('#')[1] || '')
    const token = params.get('token')
    if (token) return { token }
    return { error: params.get('oauth_error') || 'Sign-in failed' }
  } catch (err) {
    // The session rejects when the person closes it before finishing.
    const message = err instanceof Error ? err.message : String(err)
    if (/cancel/i.test(message)) return { cancelled: true }
    return { error: 'Could not open the sign-in window' }
  }
}
