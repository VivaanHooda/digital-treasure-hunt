import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/game/Dashboard'
import Game from './components/game/Game'
import Leaderboard from './components/leaderboard/Leaderboard'
import AdminPage from './components/admin/AdminPage'
import NotificationPopup from './components/common/NotificationPopup'
import LoadingSpinner from './components/common/LoadingSpinner'
import AnimatedBackground from './components/common/AnimatedBackground'
import PageTransition from './components/common/PageTransition'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  // Check if admin is logged in via session (for hardcoded admin)
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true'
  
  return (currentUser || isAdmin) ? children : <Navigate to="/login" />
}

// Hardcoded Admin Route Component - Bypasses Firebase auth for admin
const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Simulate loading check
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  // Check if admin session is active (set in Login.jsx)
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true'
  
  if (!isAdmin) {
    return <Navigate to="/login" />
  }
  
  return children
}

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  // Check if admin is logged in via session
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true'
  if (isAdmin) {
    return <Navigate to="/admin" />
  }
  
  return currentUser ? <Navigate to="/dashboard" /> : children
}

function App() {
  const location = useLocation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle route transitions with mobile optimization
  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), isMobile ? 200 : 300)
    return () => clearTimeout(timer)
  }, [location.pathname, isMobile])

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        <PageTransition isTransitioning={isTransitioning}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Hardcoded Admin Route */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/game" element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </PageTransition>

        {/* Global Notification Popup - Shows on all pages for authenticated users */}
        <NotificationPopup />
      </div>

      {/* Global UI Effects - Mobile optimized */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Ambient light effects - Responsive sizing and reduced opacity on mobile */}
        <div className={`
          absolute top-0 left-1/4 
          w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 
          ${isMobile ? 'bg-cyan-500/3' : 'bg-cyan-500/5'} 
          rounded-full blur-3xl animate-pulse
        `}></div>
        <div 
          className={`
            absolute bottom-0 right-1/4 
            w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 
            ${isMobile ? 'bg-purple-500/3' : 'bg-purple-500/5'} 
            rounded-full blur-3xl animate-pulse
          `} 
          style={{ animationDelay: '1s' }}
        ></div>
        <div 
          className={`
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
            w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 
            ${isMobile ? 'bg-blue-500/2' : 'bg-blue-500/3'} 
            rounded-full blur-3xl animate-pulse
          `} 
          style={{ animationDelay: '2s' }}
        ></div>
      </div>
    </div>
  )
}

export default App