import { createContext, useContext, ReactNode } from 'react'
import type { User } from '../types'

interface AppContextType {
  user: User | null
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ user, children }: { user: User | null; children: ReactNode }) {
  return (
    <AppContext.Provider value={{ user }}>
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
