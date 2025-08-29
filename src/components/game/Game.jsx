// Game Component - Mobile Optimized
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import { useAuth } from '../../hooks/useAuth'
import { GameOverPopup, CountdownToStart } from '../../components/GameOverPopup'
import SkipHeartsDisplay from '../../components/SkipHeartsDisplay'
import { canUseSkip, getRemainingSkips, getChallengeById } from '../../utils/gameUtils'
import { 
  MapPin, 
  Clock, 
  Trophy, 
  Image, 
  ScrollText, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  Users,
  Target,
  Zap,
  Lightbulb,
  Eye,
  Crosshair,
  ArrowRight,
  SkipForward,
  Heart
} from 'lucide-react'

// Success Popup Component - Mobile Optimized
const SuccessPopup = ({ message, onNext, isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-3 sm:p-6">
      {/* Confetti Effect - Optimized for mobile */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#00ffff', '#bf00ff', '#ff0080', '#39ff14', '#ffff00'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-green-500/50 text-center max-w-sm sm:max-w-md w-full mx-4 shadow-2xl shadow-green-500/25 transform animate-scaleIn">
        {/* Success Icon - Responsive sizing */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg animate-pulse">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        {/* Success Message - Responsive typography */}
        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-3 sm:mb-4">
          Correct!
        </h2>
        
        <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-tight">
          {message}
        </p>

        {/* Next Button - Mobile optimized */}
        <button
          onClick={onNext}
          className="group relative overflow-hidden px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg w-full min-h-[48px]"
        >
          <div className="relative z-10 flex items-center justify-center">
            <span className="mr-2 sm:mr-3">Next</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>
    </div>
  )
}

// Skip Confirmation Popup - Mobile Optimized
const SkipConfirmationPopup = ({ challenge, onConfirm, onCancel, isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-orange-500/50 text-center max-w-sm sm:max-w-md w-full mx-4 shadow-2xl">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Skip This Challenge?</h2>
        
        <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-gray-300 mb-2 text-sm sm:text-base">
            <strong className="text-white">"{challenge?.title}"</strong>
          </p>
          <p className="text-orange-300 text-xs sm:text-sm">
            ⚠️ You'll lose 5 points and one skip heart
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg sm:rounded-xl font-semibold transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white rounded-lg sm:rounded-xl font-semibold transition-all min-h-[48px]"
          >
            Skip (-5 pts)
          </button>
        </div>
      </div>
    </div>
  )
}

const Game = () => {
  const navigate = useNavigate()
  const { currentUser, teamData } = useAuth()
  const {
    gameState,
    currentChallenge,
    timeRemaining,
    timeUntilStart,
    cooldownRemaining,
    loading,
    verificationLoading,
    locationError,
    isGameActive,
    isGamePaused,
    hasGameStarted,
    challengesCompleted,
    picturesChallengesCompleted,
    riddleChallengesCompleted,
    gameTimeUp,
    initializeGame,
    resetGameTimeUp,
    formatTime,
    clearLocationError,
    verifyCurrentLocation,
    skipCurrentChallenge // This needs to be added to useGame hook
  } = useGame()

  const [isVisible, setIsVisible] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [pulseClass, setPulseClass] = useState('')
  const [confetti, setConfetti] = useState([])
  const [successPopup, setSuccessPopup] = useState({ show: false, message: '' })
  const [localLocationError, setLocalLocationError] = useState(null)
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showReadyNotification, setShowReadyNotification] = useState(false)
  
  // Fixed challenge type stats calculation
  const [correctedPicturesChallengesCompleted, setCorrectedPicturesChallengesCompleted] = useState(0)
  const [correctedRiddleChallengesCompleted, setCorrectedRiddleChallengesCompleted] = useState(0)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate challenge type statistics correctly
  useEffect(() => {
    const calculateChallengeTypeStats = async () => {
      if (!gameState?.completedChallenges || !currentUser?.uid) {
        setCorrectedPicturesChallengesCompleted(0)
        setCorrectedRiddleChallengesCompleted(0)
        return
      }

      let picturesCompleted = 0
      let riddlesCompleted = 0

      for (const challengeId of gameState.completedChallenges) {
        try {
          const challenge = await getChallengeById(challengeId, currentUser.uid)
          if (challenge) {
            if (challenge.type === 'picture') {
              picturesCompleted++
            } else if (challenge.type === 'riddle') {
              riddlesCompleted++
            }
          }
        } catch (error) {
          console.error('Error fetching challenge:', error)
        }
      }

      setCorrectedPicturesChallengesCompleted(picturesCompleted)
      setCorrectedRiddleChallengesCompleted(riddlesCompleted)
    }

    calculateChallengeTypeStats()
  }, [gameState?.completedChallenges, currentUser?.uid])

  // Get skip-related data
  const remainingSkips = getRemainingSkips(gameState?.skipsUsed || 0)
  const canSkip = canUseSkip(gameState?.skipsUsed || 0)

  // Calculate correct mission score (base score minus skip penalties)
  const correctMissionScore = Math.max(0, (gameState?.score || 0) - ((gameState?.skipsUsed || 0) * 5))

  // Initialize game if needed
  useEffect(() => {
    if (!loading && !gameState && currentUser) {
      initializeGame()
    }
  }, [loading, gameState, currentUser, initializeGame])

  // Redirect if no user
  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
    }
  }, [currentUser, navigate])

  // Visibility animation
  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Only clear general error message when cooldown ends but keep distance error
  useEffect(() => {
    if (cooldownRemaining === 0 && localLocationError && !localLocationError.includes('away from the target')) {
      setLocalLocationError(null)
    }
  }, [cooldownRemaining, localLocationError])

  // Monitor cooldown and show notification when it ends
  useEffect(() => {
    if (cooldownRemaining === 1) { // When cooldown is about to end
      setTimeout(() => {
        setShowReadyNotification(true)
        setTimeout(() => setShowReadyNotification(false), 5000) // Hide after 5 seconds
      }, 1000) // Wait for cooldown to actually end
    }
  }, [cooldownRemaining])

  // Handle skip confirmation
  const handleSkipRequest = () => {
    if (!canSkip || !currentChallenge) return
    setShowSkipConfirmation(true)
  }

  const handleSkipConfirm = async () => {
    setShowSkipConfirmation(false)
    
    try {
      // Call the skip function from useGame hook
      await skipCurrentChallenge()
      
      // Reload the page to ensure fresh state and clear any cooldowns
      window.location.reload()
    } catch (error) {
      console.error('Skip error:', error)
      setLocalLocationError('Failed to skip challenge. Please try again.')
    }
  }

  const handleSkipCancel = () => {
    setShowSkipConfirmation(false)
  }

  // Custom location verification that shows success popup instead of alert
  const handleLocationVerification = async () => {
    setLocalLocationError(null)
    
    if (!currentChallenge || !currentUser?.uid) return
    
    // Check if game is active
    if (!isGameActive) {
      setLocalLocationError('Game is currently paused')
      return
    }

    // Check if game has started
    if (timeUntilStart > 0) {
      setLocalLocationError('Game has not started yet')
      return
    }

    // Check if game is complete
    if (gameState?.isGameComplete) {
      setLocalLocationError('Game has ended')
      return
    }

    // Check cooldown
    if (cooldownRemaining > 0) {
      setLocalLocationError(`Please wait ${cooldownRemaining} seconds before trying again`)
      return
    }

    try {
      // Get user location
      const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'))
            return
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              })
            },
            (error) => {
              let errorMessage = 'Unable to get location: '
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage += 'Location access denied by user'
                  break
                case error.POSITION_UNAVAILABLE:
                  errorMessage += 'Location information unavailable'
                  break
                case error.TIMEOUT:
                  errorMessage += 'Location request timed out'
                  break
                default:
                  errorMessage += 'Unknown error'
                  break
              }
              reject(new Error(errorMessage))
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }
          )
        })
      }

      const userLocation = await getCurrentLocation()
      
      // Calculate distance manually (same logic as in gameUtils)
      const targetLat = currentChallenge.targetLocation.latitude
      const targetLng = currentChallenge.targetLocation.longitude
      const userLat = userLocation.latitude
      const userLng = userLocation.longitude
      
      const R = 6371e3 // Earth's radius in meters
      const φ1 = userLat * Math.PI/180
      const φ2 = targetLat * Math.PI/180
      const Δφ = (targetLat-userLat) * Math.PI/180
      const Δλ = (targetLng-userLng) * Math.PI/180

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

      const distance = Math.round(R * c * 100) / 100 // Round to 2 decimal places
      const isCorrect = distance <= currentChallenge.marginOfError

      if (isCorrect) {
        // Success - show our popup first
        setSuccessPopup({
          show: true,
          message: `You were ${distance}m away.`
        })
        
        // Then update game state manually (copying logic from useGame hook)
        const { updateGameState } = await import('../../firebase/collections')
        
        const newCompletedChallenges = [...(gameState.completedChallenges || []), currentChallenge.id]
        const newScore = (gameState.score || 0) + currentChallenge.points
        
        const getNextChallengeId = (completedChallenges) => {
          for (let i = 0; i < 40; i++) {
            if (!completedChallenges.includes(i)) {
              return i
            }
          }
          return null
        }
        
        const nextChallengeId = getNextChallengeId(newCompletedChallenges)
        const isGameComplete = newCompletedChallenges.length >= 40
        
        const updatedState = {
          ...gameState,
          completedChallenges: newCompletedChallenges,
          currentChallenge: nextChallengeId,
          score: newScore,
          cooldownEnd: null,
          lastCompletedTime: new Date(),
          isGameComplete,
          lastAttemptDistance: null // Clear distance on correct answer
        }

        await updateGameState(currentUser.uid, updatedState)
        
        // Store the updated state temporarily so the popup can show updated info
        window.tempGameUpdate = updatedState
        
      } else {
        // Incorrect - set cooldown and show error
        const newCooldownEnd = Date.now() + (60 * 1000) // 1 minute cooldown
        
        const updatedState = {
          ...gameState,
          cooldownEnd: newCooldownEnd,
          lastAttemptTime: new Date(),
          lastAttemptDistance: distance // Store the distance
        }
        
        const { updateGameState } = await import('../../firebase/collections')
        await updateGameState(currentUser.uid, updatedState)
        
        // Set local error to show distance immediately
        setLocalLocationError(`You are ${distance}m away from the target location.`)
        
        // Update local state to trigger cooldown timer
        window.tempGameUpdate = updatedState
        
        // Force a page reload to ensure the cooldown state is properly updated
        window.location.reload()
      }
    } catch (error) {
      console.error('Location verification error:', error)
      setLocalLocationError(error.message)
    }
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const handleSuccessPopupNext = async () => {
    setSuccessPopup({ show: false, message: '' })
    
    // Always reload the page to ensure fresh state and clear any cooldowns
    window.location.reload()
  }

  const handleGameTimeUp = () => {
    resetGameTimeUp()
    navigate('/leaderboard')
  }

  const handleGameStart = () => {
    // Game will automatically start when countdown reaches zero
    // This is called by CountdownToStart component
  }

  const progressPercentage = (challengesCompleted / 40) * 100

  // Use local error if it exists, otherwise use hook error, and also check for stored distance
  const displayError = localLocationError || locationError || 
    (gameState?.lastAttemptDistance ? `You are ${gameState.lastAttemptDistance}m away from the target location.` : null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm sm:text-base">Loading mission data...</p>
        </div>
      </div>
    )
  }

  // Show game over popup
  if (gameTimeUp) {
    return <GameOverPopup gameState={gameState} onClose={handleGameTimeUp} />
  }

  // Show countdown if game hasn't started yet
  if (!hasGameStarted && timeUntilStart > 0) {
    return <CountdownToStart startTime={Date.now() + timeUntilStart} onGameStart={handleGameStart} />
  }

  if (!isGameActive && hasGameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700/50 text-center backdrop-blur-xl">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-neon-purple">
            <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Mission Suspended</h2>
          <p className="text-gray-300 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
            The treasure hunt has been temporarily paused by mission control. 
            Please standby for further instructions.
          </p>
          <button
            onClick={handleBackToDashboard}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg min-h-[48px]"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    )
  }

  if (gameState?.isGameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Victory Confetti - Reduced for mobile */}
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(isMobile ? 50 : 100)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#00ffff', '#bf00ff', '#ff0080', '#39ff14'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-lg mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-10 border border-green-500/50 text-center backdrop-blur-xl shadow-neon-cyan">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-neon-cyan animate-pulse">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-3 sm:mb-4">
            Mission Complete!
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">
            Outstanding work, agent! You've successfully completed all challenges.
          </p>
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <p className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
              {correctMissionScore}
            </p>
            <p className="text-gray-400 text-sm sm:text-base">Final Mission Score</p>
          </div>
          <button
            onClick={handleBackToDashboard}
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg min-h-[48px]"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    )
  }

  if (!currentChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-red-500/50 text-center backdrop-blur-xl">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4 sm:mb-6 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Challenge Data Missing</h2>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base">
            Unable to establish connection to mission database. Please try again.
          </p>
          <button
            onClick={handleBackToDashboard}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg sm:rounded-xl transition-all duration-300 min-h-[48px]"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Success Popup */}
      <SuccessPopup 
        message={successPopup.message}
        onNext={handleSuccessPopupNext}
        isVisible={successPopup.show}
      />

      {/* Skip Confirmation Popup */}
      <SkipConfirmationPopup
        challenge={currentChallenge}
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
        isVisible={showSkipConfirmation}
      />

      {/* Confetti Animation - Mobile optimized */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map(particle => (
            <div
              key={particle.id}
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 animate-particle"
              style={{
                left: `${particle.left}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Navigation Header - Mobile optimized */}
      <nav className="relative z-20 bg-gray-900/90 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50 px-2 sm:px-3 py-2 rounded-lg transition-all duration-300 group min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs sm:text-sm">Command</span>
            </button>
            
            {/* Skip Hearts Display - Centered */}
            <div className="flex-1 flex justify-center">
              <SkipHeartsDisplay skipsRemaining={remainingSkips} />
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isGamePaused && (
                <div className="flex items-center text-orange-400 animate-pulse">
                  <Pause className="mr-1 sm:mr-2" size={14} />
                  <span className="text-xs font-medium hidden sm:inline">Paused</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Time</p>
                <p className="text-white font-mono font-bold text-sm sm:text-lg">
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className={`max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Progress Section - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Mission Progress
            </h2>
            <div className="flex items-center space-x-2 sm:space-x-4 text-base sm:text-lg font-semibold text-white">
              <span className="text-sm sm:text-base">{challengesCompleted}/40</span>
              <span className="text-gray-400 text-xs sm:text-base">Complete</span>
            </div>
          </div>
          
          <div className="relative">
            <div className="w-full bg-gray-800/50 rounded-full h-3 sm:h-4 overflow-hidden backdrop-blur-sm border border-gray-700/50">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                <span>Pictures: {correctedPicturesChallengesCompleted}/20</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                <span>Riddles: {correctedRiddleChallengesCompleted}/20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Challenge - Mobile optimized */}
        <div className="glass-dark rounded-xl sm:rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* Challenge Header - Mobile responsive */}
          <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 p-4 sm:p-8 border-b border-gray-700/50">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg ${
                  currentChallenge.type === 'picture' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-600' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}>
                  {currentChallenge.type === 'picture' ? (
                    <Image className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                  ) : (
                    <ScrollText className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                    <h3 className="text-xl sm:text-3xl font-bold text-white leading-tight">
                      {currentChallenge.title}
                    </h3>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      currentChallenge.type === 'picture' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {currentChallenge.type}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm sm:text-lg">
                    Challenge {currentChallenge.id + 1} • {currentChallenge.points} points
                  </p>
                </div>
              </div>
              
              <div className="text-center sm:text-right">
                <p className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  {correctMissionScore}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Mission Score</p>
              </div>
            </div>
          </div>

          {/* Challenge Content - Mobile optimized spacing */}
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-8">
            
            {/* Challenge Image - Mobile responsive */}
            {currentChallenge.type === 'picture' && currentChallenge.imageUrl && (
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={currentChallenge.imageUrl}
                    alt={currentChallenge.title}
                    className="max-w-full h-48 sm:h-80 object-cover rounded-xl sm:rounded-2xl shadow-2xl border border-gray-600/50"
                  />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                      <Eye className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Challenge Description - Mobile typography */}
            <div className="bg-gray-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-600/30">
              <h4 className="text-white font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center">
                <Crosshair className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-cyan-400" />
                Mission Briefing
              </h4>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                {currentChallenge.description}
              </p>
              
              {/* Hint Section - Mobile responsive */}
              {currentChallenge.type === 'riddle' && currentChallenge.hint && (
                <div className="mt-4 sm:mt-6">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-2 sm:mb-3 min-h-[44px]"
                  >
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">
                      {showHint ? 'Hide Hint' : 'Need a Hint?'}
                    </span>
                  </button>
                  
                  {showHint && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 animate-fadeIn">
                      <p className="text-cyan-300 font-medium text-sm sm:text-base">
                        💡 {currentChallenge.hint}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target Location - Mobile layout */}
            <div className="bg-gray-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-600/30">
              <div className="flex items-start justify-between flex-col sm:flex-row space-y-3 sm:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center mb-2 sm:mb-3">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mr-2" />
                    <h4 className="text-white font-bold text-lg sm:text-xl">Target Location</h4>
                  </div>
                  <p className="text-gray-300 text-base sm:text-lg mb-2">{currentChallenge.targetLocation.name}</p>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 text-green-400 mr-2" />
                    <p className="text-gray-400 text-sm sm:text-base">
                      Acceptable range: <span className="text-green-400 font-medium">{currentChallenge.marginOfError}m</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section - Mobile optimized */}
          <div className="bg-gray-800/40 p-4 sm:p-8 border-t border-gray-700/50">
            
            {/* Error Message - Mobile responsive */}
            {displayError && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/50 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <div className="flex items-start">
                  <AlertCircle className="text-red-400 mr-2 sm:mr-3 mt-1 flex-shrink-0" size={isMobile ? 16 : 20} />
                  <div>
                    <p className="text-red-300 font-medium text-sm sm:text-base">
                      {displayError.includes('away from the target') ? 'Incorrect Location' : 'Location Verification Failed'}
                    </p>
                    <p className="text-red-400 text-xs sm:text-sm mt-1">{displayError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cooldown Timer - Mobile layout */}
            {cooldownRemaining > 0 && (
              <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-orange-500/10 border border-orange-500/50 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <div className="flex items-center justify-between flex-col sm:flex-row space-y-2 sm:space-y-0">
                  <div className="flex items-center text-center sm:text-left">
                    <Clock className="text-orange-400 mr-2 sm:mr-3" size={isMobile ? 20 : 24} />
                    <div>
                      <p className="text-orange-300 font-semibold text-base sm:text-lg">System Cooldown Active</p>
                      <p className="text-orange-400 text-xs sm:text-sm">Please wait before attempting verification</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-orange-300">
                      {cooldownRemaining}s
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Row - Mobile first design */}
            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Skip Button - Mobile optimized */}
              <button
                onClick={handleSkipRequest}
                disabled={!canSkip}
                className={`
                  flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg
                  transition-all duration-300 transform relative overflow-hidden group min-h-[48px] order-2 sm:order-1
                  ${!canSkip
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40'
                  }
                `}
              >
                <SkipForward className="mr-2 group-hover:scale-110 transition-transform" size={isMobile ? 18 : 20} />
                <span className="text-sm sm:text-base">Skip (-5)</span>
                
                {canSkip && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
              </button>

              {/* Verification Button - Mobile takes full width first */}
              <button
                onClick={handleLocationVerification}
                disabled={verificationLoading || cooldownRemaining > 0}
                className={`
                  sm:col-span-3 flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg
                  transition-all duration-300 transform relative overflow-hidden group min-h-[48px] order-1 sm:order-2
                  ${verificationLoading || cooldownRemaining > 0
                    ? 'bg-gray-600 cursor-not-allowed text-white'
                    : `bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 
                       hover:scale-[1.02] shadow-lg shadow-green-500/25 hover:shadow-green-500/40 text-white ${pulseClass}`
                  }
                `}
              >
                {verificationLoading ? (
                  <>
                    <Loader2 className="mr-2 sm:mr-3 animate-spin" size={isMobile ? 20 : 24} />
                    <span>Scanning Location...</span>
                  </>
                ) : cooldownRemaining > 0 ? (
                  <>
                    <Clock className="mr-2 sm:mr-3" size={isMobile ? 20 : 24} />
                    <span>Cooldown ({cooldownRemaining}s)</span>
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 sm:mr-3 group-hover:scale-110 transition-transform" size={isMobile ? 20 : 24} />
                    <span>Verify Location</span>
                  </>
                )}
                
                {/* Shimmer effect */}
                {!verificationLoading && cooldownRemaining === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
              </button>
            </div>

            <p className="text-center text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4 leading-relaxed">
              Navigate to the target location and activate verification when ready, or use a skip if needed
            </p>
          </div>
        </div>

        {/* Stats Dashboard - Mobile grid layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {[
            { 
              icon: Trophy, 
              label: 'Mission Score', 
              value: correctMissionScore, 
              color: 'from-yellow-500 to-orange-600',
              textColor: 'text-yellow-400'
            },
            { 
              icon: Target, 
              label: 'Pictures Found', 
              value: `${correctedPicturesChallengesCompleted}/20`, 
              color: 'from-blue-500 to-cyan-600',
              textColor: 'text-blue-400'
            },
            { 
              icon: Zap, 
              label: 'Riddles Solved', 
              value: `${correctedRiddleChallengesCompleted}/20`, 
              color: 'from-purple-500 to-pink-600',
              textColor: 'text-purple-400'
            },
            { 
              icon: Heart, 
              label: 'Skips Left', 
              value: `${remainingSkips}/3`, 
              color: 'from-red-500 to-pink-600',
              textColor: 'text-red-400'
            }
          ].map((stat, index) => (
            <div
              key={index}
              className={`
                glass-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/50 text-center
                hover:scale-105 transition-all duration-300 group backdrop-blur-xl
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-lg sm:text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Team Info Footer - Mobile responsive */}
        <div className="glass-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-6 sm:mt-8 border border-gray-700/50 backdrop-blur-xl">
          <div className="flex items-center justify-between flex-col sm:flex-row space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4 text-center sm:text-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-base sm:text-lg">
                  Team: {teamData?.teamName}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {teamData?.totalMembers} active agents in the field
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center sm:justify-end space-x-4 sm:space-x-6 text-xs sm:text-sm">
              <div className="text-center">
                <p className="text-gray-400 uppercase tracking-wide">Current</p>
                <p className="text-white font-bold">Challenge {(gameState?.currentChallenge || 0) + 1}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 uppercase tracking-wide">Remaining</p>
                <p className="text-white font-bold">{40 - challengesCompleted}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 uppercase tracking-wide">Skips Used</p>
                <p className="text-white font-bold">{(gameState?.skipsUsed || 0)}/3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Hints - Removed except for hint button */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col space-y-2 sm:space-y-3 z-10 max-w-[200px]">
          {currentChallenge.type === 'riddle' && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-full px-3 py-2 text-yellow-300 text-xs sm:text-sm hover:bg-yellow-500/30 transition-colors min-h-[36px]"
            >
              💡 Need help?
            </button>
          )}
        </div>

        {/* Ready to Verify Notification */}
        {showReadyNotification && (
          <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-50 animate-slideInRight">
            <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/50 rounded-xl px-4 py-3 text-green-300 text-sm font-medium shadow-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                Ready to verify location!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Game