import { createContext, useContext, ReactNode } from 'react'
import type { User } from '../types'

interface AppContextType {
  user: User | null
  /** Open the "Add a recipe" panel. Held at the app level so it can be
      reopened from anywhere -- e.g. Back on an import sub-screen. */
  openAddSheet: () => void
  /** Whether the "Add a recipe" panel is showing, so the "+" can morph into a close. */
  addSheetOpen: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({
  user,
  openAddSheet,
  addSheetOpen,
  children,
}: {
  user: User | null
  openAddSheet: () => void
  addSheetOpen: boolean
  children: ReactNode
}) {
  return (
    <AppContext.Provider value={{ user, openAddSheet, addSheetOpen }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
