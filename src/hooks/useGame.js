// src/hooks/useGame.js - FIXED VERSION with robust error handling and race condition prevention

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { getGameState, updateGameState, subscribeToGameSettings } from '../firebase/collections'
import { getChallengesForUser, getChallengeById, verifyLocation, formatTime, getGameTimeRemaining, healthCheck } from '../utils/gameUtils'

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
  
  // Refs to prevent race conditions
  const loadingChallengeRef = useRef(false)
  const gameStateRef = useRef(null)
  const currentUserRef = useRef(null)
  
  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState
    currentUserRef.current = currentUser
  }, [gameState, currentUser])

  // ===============================================
  // ROBUST CHALLENGE LOADING WITH RACE CONDITION PREVENTION
  // ===============================================

  const loadChallengeRobust = useCallback(async (challengeId, userId, maxRetries = 3) => {
    // Prevent multiple simultaneous loads
    if (loadingChallengeRef.current) {
      console.log(`⏳ Challenge loading already in progress, skipping duplicate request`);
      return null;
    }

    if (!userId || typeof challengeId !== 'number') {
      console.error(`❌ Invalid parameters for challenge loading: challengeId=${challengeId}, userId=${userId}`);
      return null;
    }

    loadingChallengeRef.current = true;
    
    try {
      console.log(`🔍 Loading challenge ${challengeId} for user ${userId}`);
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const challenge = await getChallengeById(challengeId, userId);
          
          if (!challenge) {
            console.warn(`⚠️ Challenge ${challengeId} returned null (attempt ${attempt}/${maxRetries})`);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempt));
              continue;
            }
            return null;
          }

          // Validate challenge data
          if (!challenge.title || !challenge.description || !challenge.targetLocation) {
            console.error(`❌ Invalid challenge data for ID ${challengeId}:`, challenge);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempt));
              continue;
            }
            return null;
          }

          console.log(`✅ Successfully loaded challenge ${challengeId}: "${challenge.title}"`);
          return challenge;
          
        } catch (error) {
          console.error(`❌ Error loading challenge ${challengeId} (attempt ${attempt}/${maxRetries}):`, error);
          
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt - 1)));
            continue;
          }
          
          throw error;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load challenge ${challengeId} after ${maxRetries} attempts:`, error);
      setLocationError(`Failed to load challenge data. Please refresh the page.`);
      return null;
    } finally {
      loadingChallengeRef.current = false;
    }
  }, []);

  // ===============================================
  // GAME STATE LOADING WITH VALIDATION
  // ===============================================

  useEffect(() => {
    const loadGameState = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`🔍 Loading game state for user: ${currentUser.uid}`);
        
        const state = await getGameState(currentUser.uid);
        
        if (!state) {
          console.log(`ℹ️ No game state found for user ${currentUser.uid}, will need to initialize`);
          setGameState(null);
          setCurrentChallenge(null);
          setLoading(false);
          return;
        }

        console.log(`✅ Game state loaded:`, {
          currentChallenge: state.currentChallenge,
          completedCount: state.completedChallenges?.length || 0,
          score: state.score || 0
        });

        setGameState(state);
        
        // Load current challenge if available
        if (typeof state.currentChallenge === 'number' && state.currentChallenge >= 0) {
          console.log(`🔍 Loading current challenge: ${state.currentChallenge}`);
          
          const challenge = await loadChallengeRobust(state.currentChallenge, currentUser.uid);
          
          if (challenge) {
            setCurrentChallenge(challenge);
          } else {
            console.error(`❌ Failed to load current challenge ${state.currentChallenge}`);
            setLocationError('Failed to load current challenge. Please refresh the page.');
          }
        } else {
          console.log(`ℹ️ No current challenge set or game complete`);
          setCurrentChallenge(null);
        }
        
      } catch (error) {
        console.error('❌ Error loading game state:', error);
        setLocationError('Failed to load game data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadGameState();
  }, [currentUser, loadChallengeRobust]);

  // ===============================================
  // GAME SETTINGS SUBSCRIPTION
  // ===============================================

  useEffect(() => {
    const unsubscribe = subscribeToGameSettings((doc) => {
      if (doc.exists()) {
        const settings = doc.data();
        console.log(`⚙️ Game settings updated:`, {
          isActive: settings.isGameActive,
          isPaused: settings.isPaused,
          startTime: settings.gameStartTime?.toDate?.()?.toISOString()
        });
        setGameSettings(settings);
      }
    });

    return unsubscribe;
  }, []);

  // ===============================================
  // TIMER MANAGEMENT
  // ===============================================

  useEffect(() => {
    if (!gameSettings?.gameStartTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const startTime = gameSettings.gameStartTime.toMillis();
      
      if (now < startTime) {
        // Game hasn't started yet - show countdown to start
        setTimeUntilStart(startTime - now);
        setTimeRemaining(gameSettings.gameDuration);
      } else if (gameSettings.isGameActive) {
        // Game is active - show time remaining
        setTimeUntilStart(0);
        const remaining = getGameTimeRemaining(
          startTime,
          gameSettings.gameDuration,
          gameSettings.totalPauseTime || 0
        );
        
        setTimeRemaining(remaining);
        
        // Check for game completion
        const currentGameState = gameStateRef.current;
        if (remaining <= 0 && currentGameState && !currentGameState.isGameComplete && !gameTimeUp) {
          console.log('⏰ Game time is up!');
          handleGameComplete();
          setGameTimeUp(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameSettings, gameTimeUp]);

  // ===============================================
  // COOLDOWN TIMER
  // ===============================================

  useEffect(() => {
    if (!gameState?.cooldownEnd) {
      setCooldownRemaining(0);
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(0, gameState.cooldownEnd - Date.now());
      setCooldownRemaining(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        setCooldownRemaining(0);
        // Clear location error when cooldown ends (except distance errors)
        if (locationError && !locationError.includes('away from the target')) {
          setLocationError(null);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.cooldownEnd, locationError]);

  // ===============================================
  // GAME COMPLETION HANDLER
  // ===============================================

  const handleGameComplete = useCallback(async () => {
    const currentUserId = currentUserRef.current?.uid;
    const currentGameState = gameStateRef.current;
    
    if (!currentUserId || !currentGameState) {
      console.warn('⚠️ Cannot complete game - missing user or game state');
      return false;
    }

    try {
      console.log('🎯 Completing game for user:', currentUserId);
      
      await updateGameState(currentUserId, {
        ...currentGameState,
        isGameComplete: true,
        endTime: new Date()
      });
      
      console.log('✅ Game marked as complete');
      return true;
    } catch (error) {
      console.error('❌ Error completing game:', error);
      return false;
    }
  }, []);

  // ===============================================
  // LOCATION SERVICES
  // ===============================================

  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, 15000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          let errorMessage = 'Unable to get location: ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out';
              break;
            default:
              errorMessage += 'Unknown error';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }, []);

  // ===============================================
  // LOCATION VERIFICATION
  // ===============================================

  const verifyCurrentLocation = useCallback(async () => {
    const currentUserId = currentUserRef.current?.uid;
    const currentGameState = gameStateRef.current;
    
    if (!currentChallenge || !currentUserId) {
      console.error('❌ Cannot verify location - missing challenge or user');
      return;
    }
    
    // Pre-flight checks
    if (!gameSettings?.isGameActive) {
      setLocationError('Game is currently paused');
      return;
    }

    if (timeUntilStart > 0) {
      setLocationError('Game has not started yet');
      return;
    }

    if (currentGameState?.isGameComplete) {
      setLocationError('Game has ended');
      return;
    }

    if (cooldownRemaining > 0) {
      setLocationError(`Please wait ${cooldownRemaining} seconds before trying again`);
      return;
    }

    setVerificationLoading(true);
    setLocationError(null);

    try {
      console.log('📍 Getting user location...');
      const userLocation = await getCurrentLocation();
      
      console.log('🎯 Verifying location against challenge:', {
        challenge: currentChallenge.id,
        userLocation: { lat: userLocation.latitude, lng: userLocation.longitude },
        targetLocation: currentChallenge.targetLocation
      });
      
      const verification = verifyLocation(
        userLocation.latitude,
        userLocation.longitude,
        currentChallenge
      );

      if (verification.error) {
        setLocationError(verification.error);
        return;
      }

      if (verification.isCorrect) {
        console.log('✅ Location verification successful!', verification);
        await handleChallengeComplete(verification.distance);
      } else {
        console.log('❌ Location verification failed', verification);
        
        // Set cooldown and store distance
        const newCooldownEnd = Date.now() + (60 * 1000); // 1 minute cooldown
        
        const updatedState = {
          ...currentGameState,
          cooldownEnd: newCooldownEnd,
          lastAttemptTime: new Date(),
          lastAttemptDistance: verification.distance
        };
        
        await updateGameState(currentUserId, updatedState);
        setGameState(updatedState);
        
        setLocationError(`You are ${verification.distance}m away from the target location.`);
      }
    } catch (error) {
      console.error('❌ Location verification error:', error);
      setLocationError(error.message);
    } finally {
      setVerificationLoading(false);
    }
  }, [currentChallenge, gameSettings, timeUntilStart, cooldownRemaining, getCurrentLocation]);

  // ===============================================
  // CHALLENGE COMPLETION HANDLER
  // ===============================================

  const handleChallengeComplete = useCallback(async (distance) => {
    const currentUserId = currentUserRef.current?.uid;
    const currentGameState = gameStateRef.current;
    
    if (!currentUserId || !currentGameState || !currentChallenge) {
      console.error('❌ Cannot complete challenge - missing required data');
      return;
    }

    try {
      console.log(`🎯 Completing challenge ${currentChallenge.id} for user ${currentUserId}`);
      
      const newCompletedChallenges = [...(currentGameState.completedChallenges || []), currentChallenge.id];
      const newScore = (currentGameState.score || 0) + currentChallenge.points;
      const nextChallengeId = getNextChallengeId(newCompletedChallenges);
      
      const isGameComplete = newCompletedChallenges.length >= 40;
      
      const updatedState = {
        ...currentGameState,
        completedChallenges: newCompletedChallenges,
        currentChallenge: nextChallengeId,
        score: newScore,
        cooldownEnd: null, // Clear cooldown on success
        lastCompletedTime: new Date(),
        isGameComplete,
        lastAttemptDistance: null // Clear distance on correct answer
      };

      await updateGameState(currentUserId, updatedState);
      setGameState(updatedState);

      // Clear location error on success
      setLocationError(null);

      // Load next challenge if game not complete
      if (!isGameComplete && nextChallengeId !== null) {
        console.log(`🔍 Loading next challenge: ${nextChallengeId}`);
        const nextChallenge = await loadChallengeRobust(nextChallengeId, currentUserId);
        setCurrentChallenge(nextChallenge);
        
        if (!nextChallenge) {
          setLocationError('Failed to load next challenge. Please refresh the page.');
        }
      } else {
        setCurrentChallenge(null);
        console.log('🎉 All challenges completed!');
      }
      
    } catch (error) {
      console.error('❌ Error completing challenge:', error);
      setLocationError('Error saving progress. Please try again.');
    }
  }, [currentChallenge, loadChallengeRobust]);

  // Helper function for getting next challenge ID
  const getNextChallengeId = (completedChallenges) => {
    for (let i = 0; i < 40; i++) {
      if (!completedChallenges.includes(i)) {
        return i;
      }
    }
    return null; // All challenges completed
  };

  // ===============================================
  // SKIP CHALLENGE FUNCTIONALITY
  // ===============================================

  const skipCurrentChallenge = useCallback(async () => {
    const currentUserId = currentUserRef.current?.uid;
    const currentGameState = gameStateRef.current;
    
    if (!currentUserId || !currentGameState || !currentChallenge) {
      console.error('❌ Cannot skip challenge - missing required data');
      return false;
    }

    try {
      console.log(`⏭️ Skipping challenge ${currentChallenge.id} for user ${currentUserId}`);
      
      // Calculate penalty
      const skipsUsed = (currentGameState.skipsUsed || 0) + 1;
      const penaltyPoints = 5;
      const newScore = Math.max(0, (currentGameState.score || 0) - penaltyPoints);

      // Move to next challenge
      const newCompletedChallenges = [...(currentGameState.completedChallenges || []), currentChallenge.id];
      const nextChallengeId = getNextChallengeId(newCompletedChallenges);
      const isGameComplete = newCompletedChallenges.length >= 40;

      const updatedState = {
        ...currentGameState,
        completedChallenges: newCompletedChallenges,
        currentChallenge: nextChallengeId,
        score: newScore,
        skipsUsed,
        cooldownEnd: null, // Clear cooldown on skip
        lastCompletedTime: new Date(),
        isGameComplete,
        lastAttemptDistance: null // Clear distance on skip
      };

      await updateGameState(currentUserId, updatedState);
      setGameState(updatedState);

      // Clear any errors
      setLocationError(null);

      // Load next challenge if game not complete
      if (!isGameComplete && nextChallengeId !== null) {
        console.log(`🔍 Loading next challenge after skip: ${nextChallengeId}`);
        const nextChallenge = await loadChallengeRobust(nextChallengeId, currentUserId);
        setCurrentChallenge(nextChallenge);
        
        if (!nextChallenge) {
          setLocationError('Failed to load next challenge. Please refresh the page.');
        }
      } else {
        setCurrentChallenge(null);
      }

      return true;
    } catch (error) {
      console.error('❌ Error skipping challenge:', error);
      setLocationError('Error skipping challenge. Please try again.');
      return false;
    }
  }, [currentChallenge, loadChallengeRobust]);

  // ===============================================
  // GAME INITIALIZATION
  // ===============================================

  const initializeGame = useCallback(async () => {
    const currentUserId = currentUserRef.current?.uid;
    
    if (!currentUserId) {
      console.error('❌ Cannot initialize game - no user');
      return;
    }

    try {
      console.log(`🚀 Initializing game for user: ${currentUserId}`);
      
      // Run health check first
      const healthResult = await healthCheck(currentUserId);
      if (!healthResult.healthy) {
        console.error('❌ Health check failed:', healthResult);
        setLocationError('Failed to initialize game. Please refresh the page.');
        return;
      }

      const initialState = {
        currentChallenge: 0,
        completedChallenges: [],
        score: 0,
        startTime: new Date(),
        isGameComplete: false,
        cooldownEnd: null,
        lastAttemptDistance: null,
        skipsUsed: 0
      };

      await updateGameState(currentUserId, initialState);
      setGameState(initialState);
      
      // Load first challenge
      console.log('🔍 Loading first challenge...');
      const firstChallenge = await loadChallengeRobust(0, currentUserId);
      
      if (firstChallenge) {
        setCurrentChallenge(firstChallenge);
        console.log('✅ Game initialized successfully');
      } else {
        console.error('❌ Failed to load first challenge');
        setLocationError('Failed to load first challenge. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Error initializing game:', error);
      setLocationError('Failed to initialize game. Please refresh the page.');
    }
  }, [loadChallengeRobust]);

  // ===============================================
  // UTILITY FUNCTIONS
  // ===============================================

  const resetCooldown = useCallback(async () => {
    const currentUserId = currentUserRef.current?.uid;
    const currentGameState = gameStateRef.current;
    
    if (!currentUserId || !currentGameState) return;

    try {
      const updatedState = {
        ...currentGameState,
        cooldownEnd: null,
        lastAttemptDistance: null
      };
      
      await updateGameState(currentUserId, updatedState);
      setGameState(updatedState);
      setCooldownRemaining(0);
      setLocationError(null);
    } catch (error) {
      console.error('❌ Error resetting cooldown:', error);
    }
  }, []);

  const resetGameTimeUp = useCallback(() => {
    setGameTimeUp(false);
  }, []);

  const hasGameStarted = useCallback(() => {
    if (!gameSettings?.gameStartTime) return false;
    return Date.now() >= gameSettings.gameStartTime.toMillis();
  }, [gameSettings]);

  // ===============================================
  // CHALLENGE TYPE STATISTICS (ASYNC)
  // ===============================================

  const [challengeTypeStats, setChallengeTypeStats] = useState({ 
    picturesCompleted: 0, 
    riddlesCompleted: 0 
  });

  useEffect(() => {
    const updateStats = async () => {
      const currentUserId = currentUserRef.current?.uid;
      const currentGameState = gameStateRef.current;
      
      if (!currentGameState?.completedChallenges || !currentUserId) {
        setChallengeTypeStats({ picturesCompleted: 0, riddlesCompleted: 0 });
        return;
      }

      try {
        let picturesCompleted = 0;
        let riddlesCompleted = 0;

        // Process in batches to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < currentGameState.completedChallenges.length; i += batchSize) {
          const batch = currentGameState.completedChallenges.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (challengeId) => {
            const challenge = await getChallengeById(challengeId, currentUserId);
            return challenge;
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(challenge => {
            if (challenge) {
              if (challenge.type === 'picture') {
                picturesCompleted++;
              } else if (challenge.type === 'riddle') {
                riddlesCompleted++;
              }
            }
          });
        }

        setChallengeTypeStats({ picturesCompleted, riddlesCompleted });
      } catch (error) {
        console.error('❌ Error calculating challenge type stats:', error);
      }
    };
    
    updateStats();
  }, [gameState?.completedChallenges]);

  // ===============================================
  // RETURN HOOK VALUES
  // ===============================================

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
  };
};