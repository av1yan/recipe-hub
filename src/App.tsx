import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import SplashScreen from './screens/SplashScreen'
import SignInScreen from './screens/SignInScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import BrowseScreen from './screens/BrowseScreen'
import AddRecipeScreen from './screens/AddRecipeScreen'
import MealPlanScreen from './screens/MealPlanScreen'
import GroceryListScreen from './screens/GroceryListScreen'
import CookbooksScreen from './screens/CookbooksScreen'
import CookingModeScreen from './screens/CookingModeScreen'
import SettingsScreen from './screens/SettingsScreen'
import { setAuthToken, clearAuthToken, getAuthToken, authAPI } from './utils/api'
import type { Screen, User, Recipe } from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [user, setUser] = useState<User | null>(null)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing auth token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (token) {
        try {
          const profile = await authAPI.getProfile()
          setUser(profile)
          setScreen('home')
        } catch (error) {
          clearAuthToken()
          setScreen('signin')
        }
      } else {
        setScreen('signin')
      }
      setLoading(false)
    }

    setTimeout(checkAuth, 2000) // Splash screen delay
  }, [])

  const handleNavigation = (nextScreen: Screen, data?: any) => {
    if (nextScreen === 'recipe' && data?.recipe) {
      setCurrentRecipe(data.recipe)
    }
    setScreen(nextScreen)
  }

  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const response = await authAPI.login(email, password)
      setAuthToken(response.token)
      setUser(response.user)
      setScreen('home')
    } catch (error) {
      alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (email: string, name: string, password: string) => {
    try {
      setLoading(true)
      const response = await authAPI.register(email, name, password)
      setAuthToken(response.token)
      setUser(response.user)
      setScreen('onboarding')
    } catch (error) {
      alert(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    clearAuthToken()
    setUser(null)
    setScreen('signin')
  }

  if (loading) {
    return (
      <div className="screen" style={{ background: 'linear-gradient(135deg, #f4a261, #e9c46a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
            🍳 recipHub
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>Loading...</p>
        </div>
      </div>
    )
  }

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onNavigate={handleNavigation} />
      case 'signin':
        return <SignInScreen onSignIn={handleSignIn} onSignUp={handleSignUp} onNavigate={handleNavigation} />
      case 'onboarding':
        return <OnboardingScreen onNavigate={handleNavigation} />
      case 'home':
        return <HomeScreen onNavigate={handleNavigation} />
      case 'browse':
        return <BrowseScreen onNavigate={handleNavigation} />
      case 'recipe':
        return <BrowseScreen onNavigate={handleNavigation} />
      case 'add-recipe':
        return <AddRecipeScreen onNavigate={handleNavigation} />
      case 'meal-plan':
        return <MealPlanScreen onNavigate={handleNavigation} />
      case 'grocery':
        return <GroceryListScreen onNavigate={handleNavigation} />
      case 'cookbooks':
        return <CookbooksScreen onNavigate={handleNavigation} />
      case 'cooking-mode':
        return <CookingModeScreen recipe={currentRecipe} onNavigate={handleNavigation} />
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigation} onSignOut={handleSignOut} />
      default:
        return <HomeScreen onNavigate={handleNavigation} />
    }
  }

  return (
    <AppProvider user={user}>
      <div className="app-container">
        {renderScreen()}
      </div>
    </AppProvider>
  )
}
