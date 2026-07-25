import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import './styles/global.css'
import { initTheme } from './utils/theme'

// A native build is a real app, never the desktop phone-mock. Mark it so the
// layout fills the device (and centers a readable column on iPad). Set before
// render so there's no flash of the framed layout.
if (Capacitor.isNativePlatform()) document.documentElement.setAttribute('data-native', 'true')

initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
