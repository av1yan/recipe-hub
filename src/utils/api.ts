const PROD_API_URL = 'https://recipe-hub-backend-production.up.railway.app'

/**
 * Resolves the API base, in precedence order:
 *   1. VITE_API_URL  — point this at a local backend (see .env.example)
 *   2. the deployed backend
 *
 * Serving on localhost used to force `http://localhost:5001` and ignore
 * VITE_API_URL entirely, so `npm run dev` was dead in the water unless a
 * backend happened to be listening on that one port — and there was no way to
 * override it short of editing this file.
 */
const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_URL || '').trim()
  const base = (configured || PROD_API_URL).replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
})()

/**
 * Where the Google/Apple buttons send the browser. This is a full navigation
 * rather than a fetch, so it needs the absolute URL.
 */
export function oauthStartUrl(provider: string): string {
  return `${API_BASE_URL}/auth/oauth/${provider}/start`
}

let authToken: string | null = null

export function setAuthToken(token: string) {
  authToken = token
  localStorage.setItem('authToken', token)
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('authToken')
  }
  return authToken
}

export function clearAuthToken() {
  authToken = null
  localStorage.removeItem('authToken')
}

interface ApiRequestOptions {
  method?: string
  body?: any
  requiresAuth?: boolean
}

async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const {
    method = 'GET',
    body = null,
    requiresAuth = true,
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (requiresAuth) {
    const token = getAuthToken()
    if (!token) {
      throw new Error('No authentication token found')
    }
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Auth endpoints
export const authAPI = {
  register: (email: string, name: string, password: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: { email, name, password },
      requiresAuth: false,
    }),

  /** `identifier` is an email address or a username. */
  login: (identifier: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      requiresAuth: false,
    }),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, requiresAuth: false }),

  resetPassword: (token: string, password: string) =>
    apiRequest('/auth/reset-password', { method: 'POST', body: { token, password }, requiresAuth: false }),

  /** Whether the server can actually send reset links. */
  passwordResetAvailable: () => apiRequest('/auth/password-reset/available', { requiresAuth: false }),

  /** Which OAuth providers the API has credentials for, e.g. { google: true }. */
  oauthProviders: () => apiRequest('/auth/oauth/providers', { requiresAuth: false }),

  getProfile: () => apiRequest('/auth/profile'),

  updateProfile: (data: { name?: string; username?: string }) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: data,
    }),
}

// Import endpoints — both return a draft to review; neither saves anything.
export const importAPI = {
  url: (url: string) => apiRequest('/recipes/import/url', { method: 'POST', body: { url } }),
  /** Returns the post's caption to lay out, not a recipe. */
  social: (url: string) => apiRequest('/recipes/import/social', { method: 'POST', body: { url } }),
  text: (text: string) => apiRequest('/recipes/import/text', { method: 'POST', body: { text } }),
}

// Recipe endpoints
export const recipeAPI = {
  create: (data: any) =>
    apiRequest('/recipes', {
      method: 'POST',
      body: data,
    }),

  list: (filters?: any) => {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : ''
    return apiRequest(`/recipes${query}`)
  },

  get: (id: string) =>
    apiRequest(`/recipes/${id}`, { requiresAuth: false }),

  update: (id: string, data: any) =>
    apiRequest(`/recipes/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiRequest(`/recipes/${id}`, {
      method: 'DELETE',
    }),

  save: (id: string) =>
    apiRequest(`/recipes/${id}/save`, {
      method: 'POST',
    }),

  unsave: (id: string) =>
    apiRequest(`/recipes/${id}/save`, {
      method: 'DELETE',
    }),

  getSaved: () => apiRequest('/recipes/saved/all'),
}

// Meal Plan endpoints
export const mealPlanAPI = {
  create: (weekStart: Date, name?: string) =>
    apiRequest('/meal-plans', {
      method: 'POST',
      body: { weekStart, name },
    }),

  list: () => apiRequest('/meal-plans'),

  get: (id: string) => apiRequest(`/meal-plans/${id}`),

  delete: (id: string) =>
    apiRequest(`/meal-plans/${id}`, {
      method: 'DELETE',
    }),

  addMeal: (id: string, recipeId: string, day: string, mealType: string) =>
    apiRequest(`/meal-plans/${id}/meals`, {
      method: 'POST',
      body: { recipeId, day, mealType },
    }),

  removeMeal: (mealId: string) =>
    apiRequest(`/meal-plans/meals/${mealId}`, {
      method: 'DELETE',
    }),
}

// Grocery List endpoints
export const groceryAPI = {
  create: (name: string) =>
    apiRequest('/grocery-lists', {
      method: 'POST',
      body: { name },
    }),

  list: () => apiRequest('/grocery-lists'),

  get: (id: string) => apiRequest(`/grocery-lists/${id}`),

  addItem: (listId: string, item: any) =>
    apiRequest(`/grocery-lists/${listId}/items`, {
      method: 'POST',
      body: item,
    }),

  updateItem: (itemId: string, checked: boolean) =>
    apiRequest(`/grocery-lists/items/${itemId}`, {
      method: 'PUT',
      body: { checked },
    }),

  removeItem: (itemId: string) =>
    apiRequest(`/grocery-lists/items/${itemId}`, {
      method: 'DELETE',
    }),
}

// Cookbook endpoints
export const cookbookAPI = {
  create: (name: string, description?: string) =>
    apiRequest('/cookbooks', {
      method: 'POST',
      body: { name, description },
    }),

  list: () => apiRequest('/cookbooks'),

  get: (id: string) => apiRequest(`/cookbooks/${id}`),

  /** Deletes the cookbook only — the recipes in it stay. */
  delete: (id: string) => apiRequest(`/cookbooks/${id}`, { method: 'DELETE' }),

  addRecipe: (cookbookId: string, recipeId: string) =>
    apiRequest(`/cookbooks/${cookbookId}/recipes`, {
      method: 'POST',
      body: { recipeId },
    }),

  removeRecipe: (cookbookId: string, recipeId: string) =>
    apiRequest(`/cookbooks/${cookbookId}/recipes/${recipeId}`, {
      method: 'DELETE',
    }),
}
