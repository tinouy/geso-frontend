import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkInitialization: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      checkAuth()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setUser(response.data)
      setIsAuthenticated(true)
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/auth/login/json', { username, password })
    localStorage.setItem('token', response.data.access_token)
    await checkAuth()
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  const checkInitialization = async (): Promise<boolean> => {
    try {
      // Usar fetch directamente sin interceptores para endpoint público
      const getBackendUrl = (await import('../utils/backendUrl')).default
      const backendUrl = getBackendUrl()
      
      const response = await fetch(`${backendUrl}/api/config/initialized`)
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText)
        return false
      }
      const data = await response.json()
      console.log('Initialization check result:', data)
      return data.initialized === true
    } catch (error) {
      console.error('Error checking initialization:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        checkInitialization,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

