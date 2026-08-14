import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  // Only add the Bearer token if it's not already explicitly provided in the request
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on auth endpoints — let the login form show the error
      const url = error.config?.url || ''
      const isAuthEndpoint = /\/(student-login|teacher-login|google\/verify|login|update-password|reset-password)/.test(url)
      if (!isAuthEndpoint) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    return await Promise.reject(error)
  }
)

export default apiClient
