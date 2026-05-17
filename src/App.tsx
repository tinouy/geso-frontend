import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Config from './pages/Config'
import Wizard from './pages/Wizard'
import CheckMember from './pages/CheckMember'
import Profile from './pages/Profile'
import Users from './pages/Users'
import './App.css'

function AppRoutes() {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const { isAuthenticated, checkInitialization } = useAuth()

  useEffect(() => {
    checkInitStatus()
  }, [])

  const checkInitStatus = async () => {
    try {
      const initialized = await checkInitialization()
      setIsInitialized(initialized)
    } catch (error) {
      console.error('Error checking initialization:', error)
      setIsInitialized(false)
    }
  }

  if (isInitialized === null) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/wizard"
          element={
            isInitialized ? <Navigate to="/login" replace /> : <Wizard onComplete={checkInitStatus} />
          }
        />
        <Route
          path="/login"
          element={
            isInitialized === false ? (
              <Navigate to="/wizard" replace />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/check-member/:memberNumber?"
          element={<CheckMember />}
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/members"
          element={
            isAuthenticated ? <Members /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/config"
          element={
            isAuthenticated ? <Config /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? <Users /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
