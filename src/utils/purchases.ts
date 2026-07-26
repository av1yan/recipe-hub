// RevenueCat / StoreKit purchase flow, isolated behind a small wrapper.
//
// Everything here is a no-op unless we're on a native build *and* a RevenueCat
// public key for that store was baked in at build time (VITE_REVENUECAT_IOS_KEY
// on iOS, VITE_REVENUECAT_ANDROID_KEY on Android). That keeps the web app and any
// un-keyed build fully functional -- the Subscription screen just degrades to
// "not available yet" instead of throwing.
//
// The SDK is imported lazily so the native module never loads on the web.

import { Capacitor } from '@capacitor/core'

// The entitlement identifier configured in the RevenueCat dashboard; must match
// the backend's expectation.
const ENTITLEMENT = 'pro'

// RevenueCat public SDK keys are per store: an Apple key on iOS, a Google key on
// Android. Both are baked in at build time; we configure the SDK with whichever
// one matches the platform this build runs on. Web (and any other platform) has
// neither, so purchases stay unavailable there.
const IOS_KEY = (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined)?.trim() || ''
const ANDROID_KEY = (import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined)?.trim() || ''

/** The RevenueCat public key for this build's store, or '' on web / unkeyed builds. */
function platformKey(): string {
  switch (Capacitor.getPlatform()) {
    case 'ios':
      return IOS_KEY
    case 'android':
      return ANDROID_KEY
    default:
      return ''
  }
}

let mod: typeof import('@revenuecat/purchases-capacitor') | null = null
let configuredFor: string | null = null

/** True only when a real purchase can be attempted on this build. */
export function purchasesAvailable(): boolean {
  return Capacitor.isNativePlatform() && Boolean(platformKey())
}

async function sdk() {
  if (!mod) mod = await import('@revenuecat/purchases-capacitor')
  return mod
}

/**
 * Configure the SDK once, then tie the RevenueCat identity to our account id so
 * a subscription follows the person across devices and our backend can look them
 * up by the same id. Safe to call on every sign-in.
 */
export async function initPurchases(userId: string): Promise<void> {
  if (!purchasesAvailable() || configuredFor === userId) return
  const { Purchases, LOG_LEVEL } = await sdk()
  try {
    if (configuredFor === null) {
      await Purchases.configure({ apiKey: platformKey(), appUserID: userId })
      await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR }).catch(() => {})
    } else {
      await Purchases.logIn({ appUserID: userId })
    }
    configuredFor = userId
  } catch {
    // Leave configuredFor as-is so a later call retries.
  }
}

async function monthlyPackage() {
  const { Purchases } = await sdk()
  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) return null
  return current.monthly ?? current.availablePackages[0] ?? null
}

/** The monthly plan's localized price (e.g. "$4.99"), or null if unavailable. */
export async function getMonthlyPrice(): Promise<string | null> {
  if (!purchasesAvailable()) return null
  try {
    const pkg = await monthlyPackage()
    return pkg?.product.priceString ?? null
  } catch {
    return null
  }
}

export type PurchaseResult = 'purchased' | 'cancelled'

/** Present the App Store purchase sheet for the monthly plan. */
export async function purchaseMonthly(): Promise<PurchaseResult> {
  if (!purchasesAvailable()) throw new Error('Subscriptions are not available yet.')
  const { Purchases } = await sdk()
  const pkg = await monthlyPackage()
  if (!pkg) throw new Error('No subscription is available right now.')
  try {
    await Purchases.purchasePackage({ aPackage: pkg })
    return 'purchased'
  } catch (e: any) {
    if (e?.userCancelled || /cancel/i.test(String(e?.message ?? ''))) return 'cancelled'
    throw new Error(e?.message || 'The purchase could not be completed.')
  }
}

/** Restore a prior subscription. Apple requires this to be reachable. */
export async function restorePurchases(): Promise<boolean> {
  if (!purchasesAvailable()) throw new Error('Subscriptions are not available yet.')
  const { Purchases } = await sdk()
  const { customerInfo } = await Purchases.restorePurchases()
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT])
}
