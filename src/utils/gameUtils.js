// src/utils/gameUtils.js - FIXED VERSION with proper error handling and async challenge loading

// Import from the main challengeData file (which now handles switching)
import { getChallengesForUser as getChallengesForUserDynamic, getChallengeById as getChallengeByIdDynamic } from '../data/challengeData'

// ===============================================
// LOCATION VERIFICATION
// ===============================================

// Distance calculation using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Location verification with comprehensive error handling
export const verifyLocation = (userLat, userLng, challenge) => {
  try {
    // Validate inputs
    if (!challenge || !challenge.targetLocation) {
      console.error('❌ Invalid challenge data for location verification');
      throw new Error('Invalid challenge data');
    }

    if (typeof userLat !== 'number' || typeof userLng !== 'number') {
      console.error('❌ Invalid user coordinates');
      throw new Error('Invalid user coordinates');
    }

    if (typeof challenge.targetLocation.latitude !== 'number' || 
        typeof challenge.targetLocation.longitude !== 'number') {
      console.error('❌ Invalid target coordinates');
      throw new Error('Invalid target coordinates');
    }

    const distance = calculateDistance(
      userLat, 
      userLng, 
      challenge.targetLocation.latitude, 
      challenge.targetLocation.longitude
    );
    
    // Validate margin of error
    const marginOfError = challenge.marginOfError || 50; // Default to 50m
    
    return {
      isCorrect: distance <= marginOfError,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      marginOfError: marginOfError
    };
  } catch (error) {
    console.error('❌ Location verification failed:', error);
    return {
      isCorrect: false,
      distance: null,
      error: error.message
    };
  }
};

// ===============================================
// CHALLENGE DATA ACCESS (FIXED VERSION)
// ===============================================

// FIXED: Robust async version of getChallengeById with retry logic
export const getChallengeById = async (id, userId = null, retryCount = 3) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // Validate ID first
      if (typeof id !== 'number' || id < 0 || id >= 40) {
        console.error(`❌ Invalid challenge ID: ${id}`);
        return null;
      }

      console.log(`🔍 Attempting to get challenge ${id} for user ${userId} (attempt ${attempt}/${retryCount})`);
      
      const challenge = await getChallengeByIdDynamic(id, userId);
      
      if (!challenge) {
        console.warn(`⚠️ Challenge ${id} not found (attempt ${attempt}/${retryCount})`);
        if (attempt < retryCount) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        return null;
      }

      // Validate challenge data
      if (!challenge.title || !challenge.description || !challenge.targetLocation) {
        console.error(`❌ Invalid challenge data for ID ${id}:`, challenge);
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        return null;
      }

      console.log(`✅ Successfully loaded challenge ${id} for user ${userId}`);
      return challenge;
      
    } catch (error) {
      console.error(`❌ Error getting challenge ${id} (attempt ${attempt}/${retryCount}):`, error);
      
      if (attempt < retryCount) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt - 1)));
        continue;
      }
      
      console.error(`❌ Failed to get challenge ${id} after ${retryCount} attempts`);
      return null;
    }
  }
  
  return null;
};

// FIXED: Robust async version of getChallengesForUser with validation
export const getChallengesForUser = async (userId, validateData = true) => {
  try {
    if (!userId || typeof userId !== 'string') {
      console.error('❌ Invalid userId provided to getChallengesForUser');
      return [];
    }

    console.log(`🔍 Loading challenges for user: ${userId}`);
    
    const challenges = await getChallengesForUserDynamic(userId);
    
    if (!Array.isArray(challenges)) {
      console.error('❌ Invalid challenges data - not an array');
      return [];
    }

    if (challenges.length !== 40) {
      console.error(`❌ Invalid challenges count: ${challenges.length}, expected 40`);
      return [];
    }

    // Optional data validation
    if (validateData) {
      const invalidChallenges = challenges.filter((challenge, index) => {
        return !challenge || 
               challenge.id !== index || 
               !challenge.title || 
               !challenge.description || 
               !challenge.targetLocation ||
               typeof challenge.targetLocation.latitude !== 'number' ||
               typeof challenge.targetLocation.longitude !== 'number';
      });

      if (invalidChallenges.length > 0) {
        console.error(`❌ Found ${invalidChallenges.length} invalid challenges`, invalidChallenges);
        return [];
      }
    }

    console.log(`✅ Successfully loaded ${challenges.length} challenges for user: ${userId}`);
    return challenges;
    
  } catch (error) {
    console.error('❌ Error getting challenges for user:', error);
    return [];
  }
};

// ===============================================
// GAME TIMER FUNCTIONS
// ===============================================

export const formatTime = (milliseconds) => {
  if (typeof milliseconds !== 'number' || milliseconds < 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getGameTimeRemaining = (startTime, duration, pausedTime = 0) => {
  try {
    if (typeof startTime !== 'number' || typeof duration !== 'number') {
      console.warn('⚠️ Invalid parameters for getGameTimeRemaining');
      return 0;
    }

    const elapsed = Date.now() - startTime - (pausedTime || 0);
    const remaining = Math.max(0, duration - elapsed);
    return remaining;
  } catch (error) {
    console.error('❌ Error calculating game time remaining:', error);
    return 0;
  }
};

// ===============================================
// COOLDOWN MANAGEMENT
// ===============================================

export const setCooldown = (timestamp) => {
  const cooldownEnd = (timestamp || Date.now()) + (60 * 1000); // 1 minute from now
  return cooldownEnd;
};

export const isCooldownActive = (cooldownEnd) => {
  return cooldownEnd && Date.now() < cooldownEnd;
};

export const getCooldownRemaining = (cooldownEnd) => {
  if (!cooldownEnd) return 0;
  const remaining = cooldownEnd - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000)); // seconds
};

// ===============================================
// GAME PROGRESS UTILITIES
// ===============================================

export const calculateProgress = (completedChallenges, totalChallenges = 40) => {
  if (!Array.isArray(completedChallenges)) return 0;
  return Math.min(100, (completedChallenges.length / totalChallenges) * 100);
};

// FIXED: Async version that properly identifies challenge types
export const getChallengesByType = async (completedChallenges, userId = null) => {
  if (!Array.isArray(completedChallenges) || completedChallenges.length === 0) {
    return { pictures: 0, riddles: 0 };
  }

  let pictures = 0;
  let riddles = 0;

  try {
    // Process challenges in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < completedChallenges.length; i += batchSize) {
      const batch = completedChallenges.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (challengeId) => {
        const challenge = await getChallengeById(challengeId, userId);
        return challenge;
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(challenge => {
        if (challenge) {
          if (challenge.type === 'picture') {
            pictures++;
          } else if (challenge.type === 'riddle') {
            riddles++;
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ Error categorizing challenges by type:', error);
  }

  return { pictures, riddles };
};

// ===============================================
// GAME STATE HELPERS
// ===============================================

export const isGameComplete = (completedChallenges) => {
  return Array.isArray(completedChallenges) && completedChallenges.length >= 40;
};

export const getNextChallengeId = (completedChallenges) => {
  if (!Array.isArray(completedChallenges)) return 0;
  
  for (let i = 0; i < 40; i++) {
    if (!completedChallenges.includes(i)) {
      return i;
    }
  }
  return null; // All challenges completed
};

// ===============================================
// SKIP FUNCTIONALITY (FIXED)
// ===============================================

export const canUseSkip = (gameStateOrSkipsUsed, maxSkips = 3) => {
  try {
    // Handle both gameState object and direct skipsUsed number
    const skipsUsed = typeof gameStateOrSkipsUsed === 'object' 
      ? (gameStateOrSkipsUsed?.skipsUsed || 0)
      : (gameStateOrSkipsUsed || 0);
    
    return typeof skipsUsed === 'number' && skipsUsed < maxSkips;
  } catch (error) {
    console.error('❌ Error checking skip availability:', error);
    return false;
  }
};

export const getRemainingSkips = (gameStateOrSkipsUsed, maxSkips = 3) => {
  try {
    // Handle both gameState object and direct skipsUsed number
    const skipsUsed = typeof gameStateOrSkipsUsed === 'object' 
      ? (gameStateOrSkipsUsed?.skipsUsed || 0)
      : (gameStateOrSkipsUsed || 0);
    
    return Math.max(0, maxSkips - (skipsUsed || 0));
  } catch (error) {
    console.error('❌ Error calculating remaining skips:', error);
    return maxSkips;
  }
};

// ===============================================
// SCORE CALCULATION (FIXED ASYNC VERSION)
// ===============================================

export const calculateTotalScore = async (completedChallenges, userId = null) => {
  if (!Array.isArray(completedChallenges) || completedChallenges.length === 0) {
    return 0;
  }

  let total = 0;
  
  try {
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < completedChallenges.length; i += batchSize) {
      const batch = completedChallenges.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (challengeId) => {
        const challenge = await getChallengeById(challengeId, userId);
        return challenge?.points || 0;
      });
      
      const batchPoints = await Promise.all(batchPromises);
      total += batchPoints.reduce((sum, points) => sum + points, 0);
    }
  } catch (error) {
    console.error('❌ Error calculating total score:', error);
    // Fallback: assume 10 points per challenge
    total = completedChallenges.length * 10;
  }

  return total;
};

// ===============================================
// TIME FORMATTING VARIANTS
// ===============================================

export const formatTimeShort = (milliseconds) => {
  if (typeof milliseconds !== 'number' || milliseconds < 0) {
    return '0m';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatTimeDetailed = (milliseconds) => {
  if (typeof milliseconds !== 'number' || milliseconds < 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  
  return result.trim();
};

// ===============================================
// LOCATION UTILITIES
// ===============================================

export const formatDistance = (distanceInMeters) => {
  if (typeof distanceInMeters !== 'number' || distanceInMeters < 0) {
    return 'Unknown';
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  }
  return `${(distanceInMeters / 1000).toFixed(1)}km`;
};

// ===============================================
// ERROR HANDLING UTILITIES
// ===============================================

export const getLocationErrorMessage = (error) => {
  if (!error) return 'Unknown location error';

  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return 'Location access denied. Please enable location services and refresh the page.';
    case 2: // POSITION_UNAVAILABLE
      return 'Location unavailable. Please check your GPS signal and try again.';
    case 3: // TIMEOUT
      return 'Location request timed out. Please try again.';
    default:
      return error.message || 'Unable to get location. Please ensure location services are enabled.';
  }
};

// ===============================================
// CHALLENGE DATA VALIDATION
// ===============================================

export const validateChallengeData = (challenge) => {
  if (!challenge) return false;
  
  const required = ['id', 'title', 'description', 'type', 'targetLocation', 'points'];
  const hasAllRequired = required.every(field => challenge.hasOwnProperty(field));
  
  if (!hasAllRequired) return false;
  
  const hasValidLocation = challenge.targetLocation &&
                          typeof challenge.targetLocation.latitude === 'number' &&
                          typeof challenge.targetLocation.longitude === 'number';
  
  const hasValidType = ['picture', 'riddle'].includes(challenge.type);
  const hasValidPoints = typeof challenge.points === 'number' && challenge.points > 0;
  
  return hasValidLocation && hasValidType && hasValidPoints;
};

// ===============================================
// GAME CONSTANTS
// ===============================================

export const GAME_CONSTANTS = {
  TOTAL_CHALLENGES: 40,
  TOTAL_PICTURES: 20, // Updated to match actual data
  TOTAL_RIDDLES: 20,  // Updated to match actual data
  COOLDOWN_DURATION: 60000, // 1 minute in milliseconds
  DEFAULT_GAME_DURATION: 7200000, // 2 hours in milliseconds
  LOCATION_TIMEOUT: 15000, // 15 seconds for location requests
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds for leaderboard refresh
  MAX_SKIP_COUNT: 3, // Maximum skips allowed
  CHALLENGE_POINTS: 10, // Points per challenge
  SKIP_PENALTY: 5 // Points deducted per skip
};

// ===============================================
// DEBUGGING UTILITIES
// ===============================================

export const debugChallengeLoad = async (userId, challengeId) => {
  console.log(`🐛 Debug: Loading challenge ${challengeId} for user ${userId}`);
  
  try {
    const challenge = await getChallengeById(challengeId, userId);
    console.log(`🐛 Debug result:`, {
      success: !!challenge,
      challengeData: challenge ? {
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        hasLocation: !!challenge.targetLocation
      } : null
    });
    return challenge;
  } catch (error) {
    console.error(`🐛 Debug error:`, error);
    return null;
  }
};

export const debugUserChallenges = async (userId) => {
  console.log(`🐛 Debug: Loading all challenges for user ${userId}`);
  
  try {
    const challenges = await getChallengesForUser(userId);
    console.log(`🐛 Debug result:`, {
      success: Array.isArray(challenges),
      count: challenges.length,
      firstChallenge: challenges[0] ? {
        id: challenges[0].id,
        title: challenges[0].title,
        type: challenges[0].type
      } : null,
      lastChallenge: challenges[39] ? {
        id: challenges[39].id,
        title: challenges[39].title,
        type: challenges[39].type
      } : null
    });
    return challenges;
  } catch (error) {
    console.error(`🐛 Debug error:`, error);
    return [];
  }
};

// ===============================================
// HEALTH CHECK FUNCTION
// ===============================================

export const healthCheck = async (userId) => {
  const results = {
    timestamp: new Date().toISOString(),
    userId: userId,
    tests: {}
  };

  // Test 1: Load all challenges
  try {
    const challenges = await getChallengesForUser(userId);
    results.tests.loadAllChallenges = {
      passed: challenges.length === 40,
      count: challenges.length,
      error: challenges.length !== 40 ? `Expected 40, got ${challenges.length}` : null
    };
  } catch (error) {
    results.tests.loadAllChallenges = {
      passed: false,
      error: error.message
    };
  }

  // Test 2: Load first challenge
  try {
    const challenge = await getChallengeById(0, userId);
    results.tests.loadFirstChallenge = {
      passed: !!challenge && validateChallengeData(challenge),
      hasChallenge: !!challenge,
      isValid: challenge ? validateChallengeData(challenge) : false,
      error: !challenge ? 'Challenge not found' : !validateChallengeData(challenge) ? 'Invalid challenge data' : null
    };
  } catch (error) {
    results.tests.loadFirstChallenge = {
      passed: false,
      error: error.message
    };
  }

  // Test 3: Load last challenge
  try {
    const challenge = await getChallengeById(39, userId);
    results.tests.loadLastChallenge = {
      passed: !!challenge && validateChallengeData(challenge),
      hasChallenge: !!challenge,
      isValid: challenge ? validateChallengeData(challenge) : false,
      error: !challenge ? 'Challenge not found' : !validateChallengeData(challenge) ? 'Invalid challenge data' : null
    };
  } catch (error) {
    results.tests.loadLastChallenge = {
      passed: false,
      error: error.message
    };
  }

  // Overall health
  const passedTests = Object.values(results.tests).filter(test => test.passed).length;
  const totalTests = Object.keys(results.tests).length;
  results.healthy = passedTests === totalTests;
  results.score = `${passedTests}/${totalTests}`;

  console.log(`🏥 Health Check for user ${userId}:`, results);
  return results;
};