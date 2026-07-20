export type Screen =
  | 'splash'
  | 'signin'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'onboarding'
  | 'diet-preferences'
  | 'home'
  | 'browse'
  | 'recipe'
  | 'add-recipe'
  | 'import-web'
  | 'import-text'
  | 'import-photo'
  | 'import-social'
  | 'meal-plan'
  | 'grocery'
  | 'cookbooks'
  | 'cookbook'
  | 'cooking-mode'
  | 'favorites'
  | 'pantry'
  | 'insights'
  | 'settings'

export interface User {
  id: string
  name: string
  username?: string | null
  email: string
  avatar?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  defaultServings: number
  temperatureUnit: 'F' | 'C'
  measurementUnit: 'imperial' | 'metric'
  dietaryRestrictions: string[]
  notificationSettings: {
    mealReminders: boolean
    groceryReminders: boolean
    suggestions: boolean
  }
}

export interface Recipe {
  id: string
  name: string
  description?: string
  cuisine: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  difficulty: 'easy' | 'medium' | 'hard'
  prepTime: number
  cookTime: number
  totalTime: number
  servings: number
  calories?: number
  ingredients: Ingredient[]
  instructions: Instruction[]
  nutrition?: NutritionInfo
  imageUrl?: string
  sourceUrl?: string
  tags?: string[]
  rating?: number
  userNotes?: string
  isFavorite?: boolean
  timesCooked?: number
  lastCooked?: Date
}

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
}

export interface Instruction {
  id: string
  stepNumber: number
  text: string
  duration?: number
}

export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  allergens?: string[]
}

export interface MealPlan {
  id: string
  weekStart: Date
  meals: {
    [day: string]: {
      breakfast?: Recipe
      lunch?: Recipe
      dinner?: Recipe
      snacks?: Recipe[]
    }
  }
}

export interface GroceryList {
  id: string
  name: string
  createdAt: Date
  items: GroceryItem[]
  checked: Set<string>
}

export interface GroceryItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
  recipes?: string[]
  checked?: boolean
}

export interface Cookbook {
  id: string
  name: string
  description?: string
  recipes: Recipe[]
  coverImage?: string
  createdAt: Date
}

export interface TimerState {
  id: string
  duration: number
  elapsed: number
  label?: string
  active: boolean
}
