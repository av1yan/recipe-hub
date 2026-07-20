import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import SplashScreen from './screens/SplashScreen'
import SignInScreen from './screens/SignInScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ImportRecipeScreen from './screens/ImportRecipeScreen'
import PasswordResetScreen from './screens/PasswordResetScreen'
import CookbookDetailScreen from './screens/CookbookDetailScreen'
import DietPreferencesScreen from './screens/DietPreferencesScreen'
import HomeScreen from './screens/HomeScreen'
import BrowseScreen from './screens/BrowseScreen'
import AddRecipeScreen from './screens/AddRecipeScreen'
import MealPlanScreen from './screens/MealPlanScreen'
import GroceryListScreen from './screens/GroceryListScreen'
import CookbooksScreen from './screens/CookbooksScreen'
import FavoritesScreen from './screens/FavoritesScreen'
import PantryScreen from './screens/PantryScreen'
import InsightsScreen from './screens/InsightsScreen'
import RecipeDetailScreen from './screens/RecipeDetailScreen'
import CookingModeScreen from './screens/CookingModeScreen'
import SettingsScreen from './screens/SettingsScreen'
import { AddRecipeSheet } from './components/AddRecipeSheet'
import { setAuthToken, clearAuthToken, getAuthToken, authAPI } from './utils/api'
import { useProPlan } from './utils/proPlan'
import type { Screen, User, Recipe } from './types'

// A shared link/text from the OS share sheet arrives as ?title=&text=&url= on
// the start URL (the manifest's share_target). Work out what to import and which
// import screen to open. A URL wins; social hosts route to the social importer.
function parseSharedImport(search: string): { screen: Screen; value: string } | null {
  const q = new URLSearchParams(search)
  const url = (q.get('url') || '').trim()
  const text = (q.get('text') || '').trim()
  const title = (q.get('title') || '').trim()
  const urlInText = text.match(/https?:\/\/[^\s]+/)?.[0] || ''
  const link = url || urlInText
  if (link) {
    const social = /(^|\.)(tiktok|instagram|facebook)\.com/i.test(link)
    return { screen: social ? 'import-social' : 'import-web', value: link }
  }
  const body = [title, text].filter(Boolean).join('\n').trim()
  return body.length >= 12 ? { screen: 'import-text', value: body } : null
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [user, setUser] = useState<User | null>(null)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null)
  // A parsed import waiting to be reviewed in the Add Recipe form.
  const [draft, setDraft] = useState<any>(null)
  // The token from an emailed reset link.
  const [resetToken, setResetToken] = useState<string | null>(null)
  // Which cookbook is open.
  const [cookbookId, setCookbookId] = useState<string | null>(null)
  // Where a recipe was opened from, so its back button returns there rather
  // than always dumping you on Browse.
  const [recipeOrigin, setRecipeOrigin] = useState<Screen>('browse')
  // Where the Add Recipe form was opened from, so its back button returns there.
  const [addRecipeOrigin, setAddRecipeOrigin] = useState<Screen>('home')
  // Whether the blank form was launched from the add panel, so Back reopens the
  // panel rather than dropping onto the screen behind it.
  const [addRecipeFromPanel, setAddRecipeFromPanel] = useState(false)
  // A cookbook to pre-select when Add Recipe is opened from inside a cookbook,
  // so the new recipe files straight into it.
  const [addRecipeCookbook, setAddRecipeCookbook] = useState<string | null>(null)
  // The "Add a recipe" panel, held here so it can be reopened from anywhere --
  // Back on an import sub-screen brings it back instead of dumping you on Home.
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  // The screen the panel was opened over, so an import Back returns there.
  const [addSheetOrigin, setAddSheetOrigin] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [isProActive] = useProPlan()
  // A recipe shared into the app via the OS share sheet, waiting to be imported.
  const [sharedImport, setSharedImport] = useState<{ screen: Screen; value: string } | null>(null)

  // Mirror the Pro state onto the root element so the gold accent theme applies
  // app-wide -- parallel to how data-theme drives light/dark.
  useEffect(() => {
    document.documentElement.setAttribute('data-pro', isProActive ? 'true' : 'false')
  }, [isProActive])

  // Check for existing auth token on load
  useEffect(() => {
    const checkAuth = async () => {
      // A recipe shared into the app lands as ?title/text/url on the start URL.
      // Capture it and strip the query so a reload doesn't re-import.
      const shared = parseSharedImport(window.location.search)
      if (shared) history.replaceState(null, '', window.location.pathname)

      // An OAuth callback hands the token back in the fragment. Consume it
      // before anything else, and strip it so a copied URL isn't a live
      // credential.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const oauthToken = hash.get('token')
      if (oauthToken) {
        setAuthToken(oauthToken)
        history.replaceState(null, '', window.location.pathname)
      }

      // A reset link lands here. It must win over any existing session --
      // whoever opened it is proving the inbox, not the session.
      //
      // The token is parked in sessionStorage before the URL is cleaned,
      // because stripping the hash destroys the only copy: anything that runs
      // this again (StrictMode does, twice, in development) would find nothing
      // and fall through to sign-in. The auth token above survives that only
      // because setAuthToken persists it first.
      const reset = hash.get('reset') || sessionStorage.getItem('pendingReset')
      if (reset) {
        sessionStorage.setItem('pendingReset', reset)
        setResetToken(reset)
        history.replaceState(null, '', window.location.pathname)
        setScreen('reset-password')
        setLoading(false)
        return
      }

      const token = getAuthToken()
      const onboardingCompleted = localStorage.getItem('onboardingCompleted')
      if (token) {
        try {
          const profile = await authAPI.getProfile()
          setUser(profile)
          if (shared) { setSharedImport(shared); setScreen(shared.screen) }
          else setScreen(onboardingCompleted ? 'home' : 'onboarding')
        } catch (error) {
          clearAuthToken()
          if (shared) sessionStorage.setItem('pendingShare', JSON.stringify(shared))
          setScreen('signin')
        }
      } else {
        if (shared) sessionStorage.setItem('pendingShare', JSON.stringify(shared))
        setScreen('signin')
      }
      setLoading(false)
    }

    setTimeout(checkAuth, 2000) // Splash screen delay
  }, [])

  const handleNavigation = (nextScreen: Screen, data?: any) => {
    // A pending shared import is consumed by the import screen it opens; clear it
    // once we move anywhere else so it can't re-trigger.
    if (sharedImport && nextScreen !== sharedImport.screen) setSharedImport(null)
    if (nextScreen === 'recipe' && data?.recipe) {
      setCurrentRecipe(data.recipe)
      // 'recipe' -> 'recipe' would strand you; cooking-mode returns here itself.
      if (screen !== 'recipe') setRecipeOrigin(screen)
    }
    // Only carry a draft into the form when one was just parsed; opening the
    // form any other way must start blank.
    if (nextScreen === 'add-recipe') {
      setDraft(data?.draft ?? null)
      // Remember where we came from; 'add-recipe' -> 'add-recipe' would strand you.
      if (screen !== 'add-recipe') setAddRecipeOrigin(screen)
      setAddRecipeFromPanel(Boolean(data?.fromAddPanel))
      setAddRecipeCookbook(data?.cookbookId ?? null)
    }
    if (nextScreen === 'cookbook' && data?.cookbookId) {
      setCookbookId(data.cookbookId)
    }
    setScreen(nextScreen)
    // Back from an import screen asks to bring the panel back up. The origin it
    // reopens over is captured when the panel is opened (openAddSheet), not here
    // -- deriving it from screen transitions misfires on Review -> import Back.
    setAddSheetOpen(Boolean(data?.openAddSheet))
  }

  // Opening the panel: remember the screen it's opening over, so a Back out of
  // an import sub-screen reopens it there.
  const openAddSheet = () => {
    setAddSheetOrigin(screen)
    setAddSheetOpen(true)
  }

  // `loading` gates the whole app behind a splash, so it must stay reserved for
  // the initial auth check. Toggling it here unmounted the sign-in form
  // mid-request and it remounted with its error state wiped -- which is why a
  // failed login could only ever be reported through a native alert.
  // SignInScreen tracks its own submitting state for the button.
  // After a fresh sign-in/up, pick up a recipe that was shared into the app
  // before the person was logged in.
  const resumePendingShare = (): boolean => {
    const raw = sessionStorage.getItem('pendingShare')
    if (!raw) return false
    sessionStorage.removeItem('pendingShare')
    try {
      const s = JSON.parse(raw) as { screen: Screen; value: string }
      setSharedImport(s)
      setScreen(s.screen)
      return true
    } catch {
      return false
    }
  }

  const handleSignIn = async (identifier: string, password: string) => {
    const response = await authAPI.login(identifier, password)
    setAuthToken(response.token)
    setUser(response.user)
    if (!resumePendingShare()) setScreen('home')
  }

  const handleSignUp = async (email: string, name: string, password: string) => {
    const response = await authAPI.register(email, name, password)
    setAuthToken(response.token)
    setUser(response.user)
    if (!resumePendingShare()) setScreen('onboarding')
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
      case 'forgot-password':
        return <PasswordResetScreen mode="request" onNavigate={handleNavigation} />
      case 'reset-password':
        return <PasswordResetScreen mode="reset" token={resetToken ?? undefined} onNavigate={handleNavigation} />
      case 'onboarding':
        return <OnboardingScreen onNavigate={handleNavigation} />
      case 'diet-preferences':
        return <DietPreferencesScreen onNavigate={handleNavigation} />
      case 'home':
        return <HomeScreen onNavigate={handleNavigation} />
      case 'browse':
        return <BrowseScreen onNavigate={handleNavigation} />
      case 'recipe':
        return <RecipeDetailScreen recipe={currentRecipe} backTo={recipeOrigin} onNavigate={handleNavigation} />
      case 'add-recipe':
        return <AddRecipeScreen onNavigate={handleNavigation} draft={draft} backTo={addRecipeOrigin} reopenPanelOnBack={addRecipeFromPanel} presetCookbookId={addRecipeCookbook} />
      case 'import-web':
        return <ImportRecipeScreen mode="web" onNavigate={handleNavigation} backTo={addSheetOrigin} initialValue={sharedImport?.screen === 'import-web' ? sharedImport.value : ''} autoStart={sharedImport?.screen === 'import-web'} />
      case 'import-text':
        return <ImportRecipeScreen mode="text" onNavigate={handleNavigation} backTo={addSheetOrigin} initialValue={sharedImport?.screen === 'import-text' ? sharedImport.value : ''} autoStart={sharedImport?.screen === 'import-text'} />
      case 'import-photo':
        return <ImportRecipeScreen mode="photo" onNavigate={handleNavigation} backTo={addSheetOrigin} />
      case 'import-social':
        return <ImportRecipeScreen mode="social" onNavigate={handleNavigation} backTo={addSheetOrigin} initialValue={sharedImport?.screen === 'import-social' ? sharedImport.value : ''} autoStart={sharedImport?.screen === 'import-social'} />
      case 'meal-plan':
        return <MealPlanScreen onNavigate={handleNavigation} />
      case 'grocery':
        return <GroceryListScreen onNavigate={handleNavigation} />
      case 'cookbook':
        return <CookbookDetailScreen cookbookId={cookbookId} onNavigate={handleNavigation} />
      case 'cookbooks':
        return <CookbooksScreen onNavigate={handleNavigation} />
      case 'favorites':
        return <FavoritesScreen onNavigate={handleNavigation} />
      case 'pantry':
        return <PantryScreen onNavigate={handleNavigation} />
      case 'insights':
        return <InsightsScreen onNavigate={handleNavigation} />
      case 'cooking-mode':
        return <CookingModeScreen recipe={currentRecipe} onNavigate={handleNavigation} />
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigation} onSignOut={handleSignOut} />
      default:
        return <HomeScreen onNavigate={handleNavigation} />
    }
  }

  return (
    <AppProvider user={user} openAddSheet={openAddSheet}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--color-desk)', padding: '20px' }}>
        <div style={{
          width: '375px',
          height: '812px',
          background: 'var(--color-card)',
          borderRadius: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: '12px solid #000'
        }}>
          {/* Status bar */}
          <div style={{ height: '44px', background: 'var(--color-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', fontSize: '14px', fontWeight: '600' }}>
            <span>9:41</span>
            <span>📶 🔋</span>
          </div>
          {/* App content */}
          <div className="app-container" style={{ flex: 1, overflowY: 'auto' }}>
            {renderScreen()}
          </div>
          {/* One panel for the whole app, overlaying the current screen. */}
          <AddRecipeSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} onNavigate={handleNavigation} />
        </div>
      </div>
    </AppProvider>
  )
}
