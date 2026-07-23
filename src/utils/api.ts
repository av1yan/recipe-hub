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
  /** Read a recipe out of a photo with Claude vision (server-side). */
  image: (image: string, mediaType: string) =>
    apiRequest('/recipes/import/image', { method: 'POST', body: { image, mediaType } }),
}

/**
 * Shrinks + re-encodes an image to keep the upload small and Claude-vision
 * friendly (its sweet spot is ~1568px on the long edge), returning bare base64
 * plus the media type. Falls back to the raw file if canvas isn't available.
 */
export async function imageToBase64(file: File, maxDim = 1568): Promise<{ base64: string; mediaType: string }> {
  const readAsDataURL = (f: Blob) => new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(f)
  })
  const strip = (dataUrl: string) => dataUrl.replace(/^data:[^,]+,/, '')
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { base64: strip(dataUrl), mediaType: 'image/jpeg' }
  } catch {
    // Couldn't process it — send the original bytes as-is.
    const dataUrl = await readAsDataURL(file)
    return { base64: strip(dataUrl), mediaType: file.type || 'image/jpeg' }
  }
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

export const insightsAPI = {
  /** Natural-language insights over the week. Returns { configured:false } until
      an API key is set on the backend. */
  ai: (summary: any) => apiRequest('/insights/ai', { method: 'POST', body: { summary } }),

  /** AI cooking assistant: adapt a recipe to a goal (e.g. 'dairy-free'). Returns
      { configured:false } until a key is set. */
  adapt: (recipe: any, goal: string) => apiRequest('/insights/adapt', { method: 'POST', body: { recipe, goal } }),

  /** AI cook: suggest dishes from the pantry. Returns { configured:false } until
      a key is set. */
  cook: (pantry: string[]) => apiRequest('/insights/cook', { method: 'POST', body: { pantry } }),
}

// Family share & sync: a household with a shared, live grocery list.
export const householdAPI = {
  /** The caller's household, or { household: null }. */
  get: () => apiRequest('/household'),
  create: (name?: string) => apiRequest('/household', { method: 'POST', body: { name } }),
  join: (code: string) => apiRequest('/household/join', { method: 'POST', body: { code } }),
  leave: () => apiRequest('/household/leave', { method: 'POST' }),
  regenerateCode: () => apiRequest('/household/regenerate-code', { method: 'POST' }),

  // Shared grocery list.
  grocery: () => apiRequest('/household/grocery'),
  addItem: (item: { name: string; quantity?: number; unit?: string; category?: string }) =>
    apiRequest('/household/grocery', { method: 'POST', body: item }),
  updateItem: (itemId: string, data: { checked?: boolean; name?: string }) =>
    apiRequest(`/household/grocery/${itemId}`, { method: 'PUT', body: data }),
  removeItem: (itemId: string) => apiRequest(`/household/grocery/${itemId}`, { method: 'DELETE' }),
  clearChecked: () => apiRequest('/household/grocery/clear-checked', { method: 'POST' }),
}
