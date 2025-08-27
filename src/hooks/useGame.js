import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getGameState, updateGameState, subscribeToGameSettings } from '../firebase/collections'
import { getChallengesForUser, getChallengeById, verifyLocation, formatTime, getGameTimeRemaining } from '../utils/gameUtils'

export const useGame = () => {
  const { currentUser } = useAuth()
  
  // Game state
  const [gameState, setGameState] = useState(null)
  const [gameSettings, setGameSettings] = useState(null)
  const [currentChallenge, setCurrentChallenge] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timeUntilStart, setTimeUntilStart] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [gameTimeUp, setGameTimeUp] = useState(false)

  // Load initial game state
  useEffect(() => {
    const loadGameState = async () => {
      if (!currentUser?.uid) return

      try {
        setLoading(true)
        const state = await getGameState(currentUser.uid)
        setGameState(state)
        
        // Load current challenge
        if (state?.currentChallenge !== undefined) {
          const challenge = getChallengeById(state.currentChallenge, currentUser.uid)
          setCurrentChallenge(challenge)
        }
      } catch (error) {
        console.error('Error loading game state:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGameState()
  }, [currentUser])

  // Subscribe to game settings for timer and pause state
  useEffect(() => {
    const unsubscribe = subscribeToGameSettings((doc) => {
      if (doc.exists()) {
        setGameSettings(doc.data())
      }
    })

    return unsubscribe
  }, [])

  // Timer countdown - handles both countdown to start and game timer
  useEffect(() => {
    if (!gameSettings?.gameStartTime) return

    const timer = setInterval(() => {
      const now = Date.now()
      const startTime = gameSettings.gameStartTime.toMillis()
      
      if (now < startTime) {
        // Game hasn't started yet - show countdown to start
        setTimeUntilStart(startTime - now)
        setTimeRemaining(gameSettings.gameDuration) // Keep full duration ready
      } else if (gameSettings.isGameActive) {
        // Game is active - show time remaining
        setTimeUntilStart(0)
        const remaining = getGameTimeRemaining(
          startTime,
          gameSettings.gameDuration,
          gameSettings.totalPauseTime || 0
        )
        
        setTimeRemaining(remaining)
        
        if (remaining <= 0 && gameState && !gameState.isGameComplete && !gameTimeUp) {
          // Game time up
          handleGameComplete()
          setGameTimeUp(true)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameSettings, gameState, gameTimeUp])

  // Cooldown timer
  useEffect(() => {
    if (!gameState?.cooldownEnd) return

    const timer = setInterval(() => {
      const remaining = Math.max(0, gameState.cooldownEnd - Date.now())
      setCooldownRemaining(Math.ceil(remaining / 1000))
      
      if (remaining <= 0) {
        setCooldownRemaining(0)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState?.cooldownEnd])

  // Handle game completion
  const handleGameComplete = useCallback(async () => {
    if (!currentUser?.uid || !gameState) return

    try {
      await updateGameState(currentUser.uid, {
        ...gameState,
        isGameComplete: true,
        endTime: new Date()
      })
      
      // Return true to indicate game completion for custom handling
      return true
    } catch (error) {
      console.error('Error completing game:', error)
      return false
    }
  }, [currentUser, gameState])

  // Get user's current location
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

  // Verify current location against challenge
  const verifyCurrentLocation = async () => {
    if (!currentChallenge || !currentUser?.uid) return
    
    // Check if game is active
    if (!gameSettings?.isGameActive) {
      setLocationError('Game is currently paused')
      return
    }

    // Check if game has started
    if (timeUntilStart > 0) {
      setLocationError('Game has not started yet')
      return
    }

    // Check if game is complete
    if (gameState?.isGameComplete) {
      setLocationError('Game has ended')
      return
    }

    // Check cooldown
    if (cooldownRemaining > 0) {
      setLocationError(`Please wait ${cooldownRemaining} seconds before trying again`)
      return
    }

    setVerificationLoading(true)
    setLocationError(null)

    try {
      const userLocation = await getCurrentLocation()
      
      const verification = verifyLocation(
        userLocation.latitude,
        userLocation.longitude,
        currentChallenge
      )

      if (verification.isCorrect) {
        // Success - move to next challenge
        await handleChallengeComplete(verification.distance)
      } else {
        // Incorrect location - set cooldown AND store distance
        const newCooldownEnd = Date.now() + (60 * 1000) // 1 minute cooldown
        
        const updatedState = {
          ...gameState,
          cooldownEnd: newCooldownEnd,
          lastAttemptTime: new Date(),
          lastAttemptDistance: verification.distance // Store the distance
        }
        
        await updateGameState(currentUser.uid, updatedState)
        setGameState(updatedState)
        
        // Set the location error with distance info
        setLocationError(`You are ${verification.distance}m away from the target location.`)
      }
    } catch (error) {
      console.error('Location verification error:', error)
      setLocationError(error.message)
    } finally {
      setVerificationLoading(false)
    }
  }

  // Handle successful challenge completion
  const handleChallengeComplete = async (distance) => {
    if (!currentUser?.uid || !gameState || !currentChallenge) return

    try {
      const newCompletedChallenges = [...(gameState.completedChallenges || []), currentChallenge.id]
      const newScore = (gameState.score || 0) + currentChallenge.points
      const nextChallengeId = getNextChallengeId(newCompletedChallenges)
      
      const isGameComplete = newCompletedChallenges.length >= 40 // 30 pictures + 10 riddles
      
      const updatedState = {
        ...gameState,
        completedChallenges: newCompletedChallenges,
        currentChallenge: nextChallengeId,
        score: newScore,
        cooldownEnd: null, // Clear cooldown on success
        lastCompletedTime: new Date(),
        isGameComplete,
        lastAttemptDistance: null // Clear distance on correct answer
      }

      await updateGameState(currentUser.uid, updatedState)
      setGameState(updatedState)

      // Clear location error on success
      setLocationError(null)

      // Load next challenge
      if (!isGameComplete && nextChallengeId !== null) {
        const nextChallenge = getChallengeById(nextChallengeId, currentUser.uid)
        setCurrentChallenge(nextChallenge)
      } else {
        setCurrentChallenge(null)
      }

      // Success message
      const successMessage = isGameComplete
        ? 'Congratulations! You have completed all challenges!'
        : `Correct! You were ${distance}m away. Moving to next challenge...`
      
      alert(successMessage)
      
    } catch (error) {
      console.error('Error completing challenge:', error)
      setLocationError('Error saving progress. Please try again.')
    }
  }

  // Skip current challenge function
  const skipCurrentChallenge = async () => {
    if (!currentUser?.uid || !gameState || !currentChallenge) return

    try {
      // Calculate penalty
      const skipsUsed = (gameState.skipsUsed || 0) + 1
      const penaltyPoints = 5
      const newScore = Math.max(0, (gameState.score || 0) - penaltyPoints)

      // Move to next challenge
      const newCompletedChallenges = [...(gameState.completedChallenges || []), currentChallenge.id]
      const nextChallengeId = getNextChallengeId(newCompletedChallenges)
      const isGameComplete = newCompletedChallenges.length >= 40

      const updatedState = {
        ...gameState,
        completedChallenges: newCompletedChallenges,
        currentChallenge: nextChallengeId,
        score: newScore,
        skipsUsed,
        cooldownEnd: null, // Clear cooldown on skip
        lastCompletedTime: new Date(),
        isGameComplete,
        lastAttemptDistance: null // Clear distance on skip
      }

      await updateGameState(currentUser.uid, updatedState)
      setGameState(updatedState)

      // Clear any errors
      setLocationError(null)

      // Load next challenge
      if (!isGameComplete && nextChallengeId !== null) {
        const nextChallenge = getChallengeById(nextChallengeId, currentUser.uid)
        setCurrentChallenge(nextChallenge)
      } else {
        setCurrentChallenge(null)
      }

      return true
    } catch (error) {
      console.error('Error skipping challenge:', error)
      setLocationError('Error skipping challenge. Please try again.')
      return false
    }
  }

  // Get next available challenge ID
  const getNextChallengeId = (completedChallenges) => {
    for (let i = 0; i < 40; i++) {
      if (!completedChallenges.includes(i)) {
        return i
      }
    }
    return null // All challenges completed
  }

  // Initialize game (for first-time players)
  const initializeGame = async () => {
    if (!currentUser?.uid) return

    try {
      const initialState = {
        currentChallenge: 0,
        completedChallenges: [],
        score: 0,
        startTime: new Date(),
        isGameComplete: false,
        cooldownEnd: null,
        lastAttemptDistance: null,
        skipsUsed: 0
      }

      await updateGameState(currentUser.uid, initialState)
      setGameState(initialState)
      
      // Use user-specific challenges
      const firstChallenge = getChallengeById(0, currentUser.uid)
      setCurrentChallenge(firstChallenge)
    } catch (error) {
      console.error('Error initializing game:', error)
    }
  }

  // Reset cooldown (admin function)
  const resetCooldown = async () => {
    if (!currentUser?.uid || !gameState) return

    try {
      const updatedState = {
        ...gameState,
        cooldownEnd: null
      }
      
      await updateGameState(currentUser.uid, updatedState)
      setGameState(updatedState)
      setCooldownRemaining(0)
    } catch (error) {
      console.error('Error resetting cooldown:', error)
    }
  }

  // Reset game time up state
  const resetGameTimeUp = () => {
    setGameTimeUp(false)
  }

  // Check if game has started
  const hasGameStarted = () => {
    if (!gameSettings?.gameStartTime) return false
    return Date.now() >= gameSettings.gameStartTime.toMillis()
  }

  // Calculate challenge type statistics - FIXED
  const calculateChallengeTypeStats = () => {
    if (!gameState?.completedChallenges || !currentUser?.uid) {
      return { picturesCompleted: 0, riddlesCompleted: 0 }
    }

    let picturesCompleted = 0
    let riddlesCompleted = 0

    gameState.completedChallenges.forEach(challengeId => {
      const challenge = getChallengeById(challengeId, currentUser.uid)
      if (challenge) {
        if (challenge.type === 'picture') {
          picturesCompleted++
        } else if (challenge.type === 'riddle') {
          riddlesCompleted++
        }
      }
    })

    return { picturesCompleted, riddlesCompleted }
  }

  const challengeTypeStats = calculateChallengeTypeStats()

  return {
    // State
    gameState,
    gameSettings,
    currentChallenge,
    timeRemaining,
    timeUntilStart,
    cooldownRemaining,
    loading,
    verificationLoading,
    locationError,
    gameTimeUp,
    
    // Computed values
    isGameActive: gameSettings?.isGameActive && !gameState?.isGameComplete && hasGameStarted(),
    isGamePaused: gameSettings?.isPaused,
    hasGameStarted: hasGameStarted(),
    totalChallenges: 40,
    challengesCompleted: gameState?.completedChallenges?.length || 0,
    picturesChallengesCompleted: challengeTypeStats.picturesCompleted,
    riddleChallengesCompleted: challengeTypeStats.riddlesCompleted,
    
    // Actions
    verifyCurrentLocation,
    initializeGame,
    resetCooldown,
    resetGameTimeUp,
    skipCurrentChallenge,
    
    // Utilities
    formatTime: (ms) => formatTime(ms),
    clearLocationError: () => setLocationError(null)
  }
}