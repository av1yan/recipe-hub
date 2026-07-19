import { useEffect, useState } from 'react'

const KEY = 'proPlan'
const EVENT = 'rh-proplan-change'

/** Whether the account is on Pro. Persisted locally so it survives reloads. */
export function isPro(): boolean {
  return localStorage.getItem(KEY) === 'true'
}

export function setPro(value: boolean) {
  localStorage.setItem(KEY, value ? 'true' : 'false')
  // Nudge every mounted useProPlan() in this tab to re-read right away; the
  // storage event only fires in *other* tabs.
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Pro state as a hook, shared across the app without threading through context.
 * Reads on mount and stays in sync via a custom event (same tab) and the
 * storage event (other tabs).
 */
export function useProPlan(): [boolean, (value: boolean) => void] {
  const [pro, setProState] = useState(isPro)
  useEffect(() => {
    const sync = () => setProState(isPro())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return [pro, setPro]
}
