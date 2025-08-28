// src/utils/gameUtils.js - Updated to work with dynamic challenge data

// Import from the main challengeData file (which now handles switching)
import { getChallengesForUser as getChallengesForUserDynamic, getChallengeById as getChallengeByIdDynamic } from '../data/challengeData'

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

// Location verification (simplified - no key system)
export const verifyLocation = (userLat, userLng, challenge) => {
  const distance = calculateDistance(
    userLat, 
    userLng, 
    challenge.targetLocation.latitude, 
    challenge.targetLocation.longitude
  );
  
  return {
    isCorrect: distance <= challenge.marginOfError,
    distance: Math.round(distance * 100) / 100
  };
};

// Async version of getChallengeById that works with dynamic data switching
export const getChallengeById = async (id, userId = null) => {
  try {
    return await getChallengeByIdDynamic(id, userId);
  } catch (error) {
    console.error('Error getting challenge by ID:', error);
    return null;
  }
};

// Async version of getChallengesForUser that works with dynamic data switching
export const getChallengesForUser = async (userId) => {
  try {
    return await getChallengesForUserDynamic(userId);
  } catch (error) {
    console.error('Error getting challenges for user:', error);
    return [];
  }
};

// Game timer functions
export const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getGameTimeRemaining = (startTime, duration, pausedTime = 0) => {
  const elapsed = Date.now() - startTime - pausedTime;
  const remaining = Math.max(0, duration - elapsed);
  return remaining;
};

// Cooldown management functions
export const setCooldown = (timestamp) => {
  const cooldownEnd = timestamp + (60 * 1000); // 1 minute from now
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

// Game progress utilities
export const calculateProgress = (completedChallenges, totalChallenges = 40) => {
  return (completedChallenges.length / totalChallenges) * 100;
};

export const getChallengesByType = (completedChallenges) => {
  return {
    pictures: completedChallenges.filter(id => id < 30).length,
    riddles: completedChallenges.filter(id => id >= 30).length
  };
};

// Game state helpers
export const isGameComplete = (completedChallenges) => {
  return completedChallenges.length >= 40;
};

export const getNextChallengeId = (completedChallenges) => {
  for (let i = 0; i < 40; i++) {
    if (!completedChallenges.includes(i)) {
      return i;
    }
  }
  return null; // All challenges completed
};

// Skip functionality - Fixed to handle both parameters correctly
export const canUseSkip = (gameStateOrSkipsUsed, maxSkips = 3) => {
  // Handle both gameState object and direct skipsUsed number
  const skipsUsed = typeof gameStateOrSkipsUsed === 'object' 
    ? (gameStateOrSkipsUsed?.skipsUsed || 0)
    : (gameStateOrSkipsUsed || 0);
  
  return skipsUsed < maxSkips;
};

export const getRemainingSkips = (gameStateOrSkipsUsed, maxSkips = 3) => {
  // Handle both gameState object and direct skipsUsed number
  const skipsUsed = typeof gameStateOrSkipsUsed === 'object' 
    ? (gameStateOrSkipsUsed?.skipsUsed || 0)
    : (gameStateOrSkipsUsed || 0);
  
  return Math.max(0, maxSkips - skipsUsed);
};

// Score calculation - Updated to be async
export const calculateTotalScore = async (completedChallenges, userId = null) => {
  let total = 0;
  for (const challengeId of completedChallenges) {
    const challenge = await getChallengeById(challengeId, userId);
    total += challenge?.points || 0;
  }
  return total;
};

// Time formatting variants
export const formatTimeShort = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatTimeDetailed = (milliseconds) => {
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

// Location utilities
export const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  }
  return `${(distanceInMeters / 1000).toFixed(1)}km`;
};

// Error handling utilities
export const getLocationErrorMessage = (error) => {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return 'Location access denied. Please enable location services and refresh the page.';
    case 2: // POSITION_UNAVAILABLE
      return 'Location unavailable. Please check your GPS signal and try again.';
    case 3: // TIMEOUT
      return 'Location request timed out. Please try again.';
    default:
      return 'Unable to get location. Please ensure location services are enabled.';
  }
};

// Game constants
export const GAME_CONSTANTS = {
  TOTAL_CHALLENGES: 40,
  TOTAL_PICTURES: 30,
  TOTAL_RIDDLES: 10,
  COOLDOWN_DURATION: 60000, // 1 minute in milliseconds
  DEFAULT_GAME_DURATION: 7200000, // 2 hours in milliseconds
  LOCATION_TIMEOUT: 15000, // 15 seconds for location requests
  AUTO_REFRESH_INTERVAL: 30000 // 30 seconds for leaderboard refresh
};