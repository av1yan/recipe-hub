import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import SplashScreen from './screens/SplashScreen'
import SignInScreen from './screens/SignInScreen'
import HomeScreen from './screens/HomeScreen'
import BrowseScreen from './screens/BrowseScreen'
import AddRecipeScreen from './screens/AddRecipeScreen'
import MealPlanScreen from './screens/MealPlanScreen'
import GroceryListScreen from './screens/GroceryListScreen'
import CookbooksScreen from './screens/CookbooksScreen'
import CookingModeScreen from './screens/CookingModeScreen'
import SettingsScreen from './screens/SettingsScreen'
import type { Screen, User, Recipe } from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [user, setUser] = useState<User | null>(null)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null)

  const handleNavigation = (nextScreen: Screen, data?: any) => {
    if (nextScreen === 'recipe' && data?.recipe) {
      setCurrentRecipe(data.recipe)
    }
    setScreen(nextScreen)
  }

  const handleSignIn = (userData: User) => {
    setUser(userData)
    setScreen('home')
  }

  const handleSignOut = () => {
    setUser(null)
    setScreen('signin')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onNavigate={handleNavigation} />
      case 'signin':
        return <SignInScreen onSignIn={handleSignIn} onNavigate={handleNavigation} />
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
