const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5001/api'
  }
  const base = import.meta.env.VITE_API_URL || 'https://recipe-hub-backend-production.up.railway.app'
  return base.endsWith('/api') ? base : `${base}/api`
})()

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

  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      requiresAuth: false,
    }),

  getProfile: () => apiRequest('/auth/profile'),
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
