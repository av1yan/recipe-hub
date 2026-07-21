import { useEffect, useState } from 'react'

const KEY = 'proPlan'
const TRIAL_KEY = 'trialStartedAt'
const TRIAL_USED_KEY = 'trialUsed'
const EVENT = 'rh-proplan-change'

// Free-plan caps. Pro removes them entirely.
export const FREE_RECIPE_LIMIT = 10
export const FREE_COOKBOOK_LIMIT = 1

export const TRIAL_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000
const TRIAL_MS = TRIAL_DAYS * DAY_MS

export interface TrialInfo {
  active: boolean
  msLeft: number
  daysLeft: number
  used: boolean
}

/** Current state of the one-time free trial. */
export function getTrialInfo(): TrialInfo {
  const startedAt = Number(localStorage.getItem(TRIAL_KEY))
  const used = localStorage.getItem(TRIAL_USED_KEY) === 'true'
  if (!startedAt || !Number.isFinite(startedAt)) return { active: false, msLeft: 0, daysLeft: 0, used }
  const msLeft = Math.max(0, startedAt + TRIAL_MS - Date.now())
  return { active: msLeft > 0, msLeft, daysLeft: Math.max(1, Math.ceil(msLeft / DAY_MS)), used }
}

/** True if the account was explicitly upgraded (not just on a trial). */
export function isUpgraded(): boolean {
  return localStorage.getItem(KEY) === 'true'
}

/** Whether the account has Pro right now — via upgrade or an active trial. */
export function isPro(): boolean {
  return isUpgraded() || getTrialInfo().active
}

export function setPro(value: boolean) {
  localStorage.setItem(KEY, value ? 'true' : 'false')
  // Switching back to Free also ends any running trial, so Pro doesn't silently
  // stay on because of a trial the user didn't mean to keep.
  if (!value) localStorage.removeItem(TRIAL_KEY)
  window.dispatchEvent(new Event(EVENT))
}

/** Begin the one-time 3-day free trial (unlocks Pro until it expires). */
export function startTrial() {
  localStorage.setItem(TRIAL_KEY, String(Date.now()))
  localStorage.setItem(TRIAL_USED_KEY, 'true')
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Pro state as a hook, shared across the app without threading through context.
 * Re-reads on mount, on the custom/storage events, on tab focus, and on a slow
 * interval so an expiring trial flips the whole app back to Free on its own.
 */
export function useProPlan(): [boolean, (value: boolean) => void] {
  const [pro, setProState] = useState(isPro)
  useEffect(() => {
    const sync = () => setProState(isPro())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    document.addEventListener('visibilitychange', sync)
    const id = setInterval(sync, 30_000)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
      document.removeEventListener('visibilitychange', sync)
      clearInterval(id)
    }
  }, [])
  return [pro, setPro]
}
