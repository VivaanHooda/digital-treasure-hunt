// Firebase Firestore Collections Schema and Helper Functions
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase.js';

// Collection Names
export const COLLECTIONS = {
  TEAMS: 'teams',
  GAME_STATE: 'gameState',
  CHALLENGES: 'challenges',
  LEADERBOARD: 'leaderboard',
  GAME_SETTINGS: 'gameSettings',
  NOTIFICATIONS: 'notifications'
};

// Helper Functions
export const createTeam = async (teamId, teamData) => {
  try {
    console.log('Creating team with ID:', teamId);
    console.log('Team data:', teamData);
    
    const teamDoc = {
      ...teamData,
      createdAt: serverTimestamp()
    };
    
    console.log('Writing team document...');
    await setDoc(doc(db, COLLECTIONS.TEAMS, teamId), teamDoc);
    console.log('Team created successfully');
    return true;
  } catch (error) {
    console.error('Error creating team:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

export const initializeGameState = async (teamId) => {
  try {
    console.log('Initializing game state for team:', teamId);
    
    const gameStateDoc = {
      currentChallenge: 0,
      completedChallenges: [],
      score: 0,
      lastGuessTime: null,
      canGuess: true,
      cooldownEnd: null,
      startTime: serverTimestamp(),
      lastActivity: serverTimestamp(),
      lastCompletedTime: null,
      isGameComplete: false
    };
    
    console.log('Writing game state document...');
    await setDoc(doc(db, COLLECTIONS.GAME_STATE, teamId), gameStateDoc);
    console.log('Game state initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing game state:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

export const getTeamData = async (teamId) => {
  try {
    console.log('Getting team data for:', teamId);
    const docRef = doc(db, COLLECTIONS.TEAMS, teamId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Team data found:', docSnap.data());
      return docSnap.data();
    } else {
      console.log('No team data found for ID:', teamId);
      return null;
    }
  } catch (error) {
    console.error('Error getting team data:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return null;
  }
};

export const getGameState = async (teamId) => {
  try {
    console.log('Getting game state for:', teamId);
    const docRef = doc(db, COLLECTIONS.GAME_STATE, teamId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Game state found:', docSnap.data());
      return docSnap.data();
    } else {
      console.log('No game state found for ID:', teamId);
      return null;
    }
  } catch (error) {
    console.error('Error getting game state:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return null;
  }
};

export const updateGameState = async (teamId, updates) => {
  try {
    console.log('Updating game state for team:', teamId);
    console.log('Updates:', updates);
    
    const docRef = doc(db, COLLECTIONS.GAME_STATE, teamId);
    await updateDoc(docRef, {
      ...updates,
      lastActivity: serverTimestamp()
    });
    console.log('Game state updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating game state:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
};

// Get leaderboard data (sorted by score, then by completion time)
export const getLeaderboard = async () => {
  try {
    console.log('Fetching leaderboard data...');
    
    // Get all game states
    const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE);
    const gameStatesQuery = query(
      gameStatesRef,
      orderBy('score', 'desc'),
      orderBy('lastCompletedTime', 'asc')
    );
    
    const gameStatesSnapshot = await getDocs(gameStatesQuery);
    console.log('Game states found:', gameStatesSnapshot.size);
    
    // Get all team data
    const teamsRef = collection(db, COLLECTIONS.TEAMS);
    const teamsSnapshot = await getDocs(teamsRef);
    console.log('Teams found:', teamsSnapshot.size);
    
    // Create a map of team data
    const teamsMap = new Map();
    teamsSnapshot.docs.forEach(doc => {
      teamsMap.set(doc.id, doc.data());
    });
    
    // Combine game states with team data
    const leaderboardData = gameStatesSnapshot.docs
      .map(doc => {
        const gameState = doc.data();
        const teamData = teamsMap.get(doc.id);
        
        if (!teamData) {
          console.warn('No team data found for game state:', doc.id);
          return null;
        }
        
        return {
          id: doc.id,
          teamName: teamData.teamLeaderName || 'Unknown Team',
          teamLeaderEmail: teamData.teamLeaderEmail,
          teamMembers: teamData.teamMembers || [],
          ...gameState,
          lastActivity: gameState.lastCompletedTime || gameState.startTime
        };
      })
      .filter(team => team !== null)
      .filter(team => team.score > 0 || (team.completedChallenges && team.completedChallenges.length > 0));
    
    console.log('Leaderboard data processed:', leaderboardData.length, 'entries');
    return leaderboardData;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    throw error;
  }
};

// Updated subscribeToLeaderboard function with better data fetching
export const subscribeToLeaderboard = (callback) => {
  console.log('Setting up leaderboard subscription...');
  
  const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE);
  const q = query(
    gameStatesRef,
    orderBy('score', 'desc'),
    orderBy('lastActivity', 'asc'),
    limit(50)
  );
  
  return onSnapshot(q, async (snapshot) => {
    try {
      console.log('Leaderboard data changed, processing...');
      
      // Get team data for teams in leaderboard
      const teamsRef = collection(db, COLLECTIONS.TEAMS);
      const teamsSnapshot = await getDocs(teamsRef);
      
      const teamsMap = new Map();
      teamsSnapshot.docs.forEach(doc => {
        teamsMap.set(doc.id, doc.data());
      });
      
      const leaderboardData = snapshot.docs
        .map(doc => {
          const gameState = doc.data();
          const teamData = teamsMap.get(doc.id);
          
          if (!teamData) {
            console.warn('No team data found for game state:', doc.id);
            return null;
          }
          
          return {
            id: doc.id,
            teamName: teamData.teamLeaderName || 'Unknown Team',
            teamLeaderEmail: teamData.teamLeaderEmail,
            teamMembers: teamData.teamMembers || [],
            ...gameState,
            lastActivity: gameState.lastCompletedTime || gameState.startTime
          };
        })
        .filter(team => team !== null)
        .filter(team => team.score > 0 || (team.completedChallenges && team.completedChallenges.length > 0));
      
      console.log('Updated leaderboard data:', leaderboardData.length, 'entries');
      callback(leaderboardData);
    } catch (error) {
      console.error('Error in leaderboard subscription:', error);
    }
  }, (error) => {
    console.error('Leaderboard subscription error:', error);
  });
};

// Get game statistics
export const getGameStats = async () => {
  try {
    console.log('Fetching game statistics...');
    
    const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE);
    const snapshot = await getDocs(gameStatesRef);
    
    const teams = snapshot.docs.map(doc => doc.data());
    console.log('Processing stats for', teams.length, 'teams');
    
    const stats = {
      totalTeams: teams.length,
      activeTeams: teams.filter(team => 
        team.lastActivity && 
        (new Date() - team.lastActivity.toDate()) < 300000 // Active in last 5 minutes
      ).length,
      completedTeams: teams.filter(team => team.isGameComplete).length,
      averageScore: teams.length > 0 
        ? Math.round(teams.reduce((sum, team) => sum + (team.score || 0), 0) / teams.length)
        : 0,
      topScore: teams.length > 0 
        ? Math.max(...teams.map(team => team.score || 0))
        : 0
    };
    
    console.log('Game statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching game stats:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    throw error;
  }
};

export const subscribeToGameSettings = (callback) => {
  console.log('Setting up game settings subscription...');
  
  const docRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global');
  return onSnapshot(docRef, callback, (error) => {
    console.error('Game settings subscription error:', error);
  });
};

// Debug function to check Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    console.log('Database instance:', db);
    
    // Try to read from a collection
    const testRef = collection(db, 'test');
    console.log('Test collection reference created:', testRef);
    
    // Try to write a test document
    const testDoc = doc(testRef, 'connection-test');
    await setDoc(testDoc, {
      timestamp: serverTimestamp(),
      message: 'Firebase connection test successful'
    });
    console.log('Test document written successfully');
    
    // Try to read the test document
    const testSnap = await getDoc(testDoc);
    if (testSnap.exists()) {
      console.log('Test document read successfully:', testSnap.data());
    }
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

// Initialize default game settings if they don't exist
export const initializeGameSettings = async () => {
  try {
    console.log('Checking/initializing game settings...');
    
    const settingsRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global');
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      console.log('No game settings found, creating defaults...');
      
      const defaultSettings = {
        gameStartTime: serverTimestamp(),
        gameDuration: 7200000, // 2 hours in milliseconds
        isPaused: false,
        pausedAt: null,
        totalPauseTime: 0,
        isGameActive: true,
        maxTeamSize: 4,
        minTeamSize: 3
      };
      
      await setDoc(settingsRef, defaultSettings);
      console.log('Default game settings created');
    } else {
      console.log('Game settings already exist:', settingsSnap.data());
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing game settings:', error);
    return false;
  }
};

// NOTIFICATION FUNCTIONS - COMPLETELY REWRITTEN

// Send notification to all users
export const sendNotification = async (notificationData) => {
  try {
    console.log('Sending notification:', notificationData);
    
    const notificationRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
    const notification = {
      id: notificationRef.id,
      message: notificationData.message,
      title: notificationData.title || 'Admin Notification',
      type: notificationData.type || 'info',
      createdAt: serverTimestamp(),
      createdBy: 'admin',
      isActive: true,
      readBy: [] // Users who have dismissed this notification
    };
    
    await setDoc(notificationRef, notification);
    console.log('Notification sent successfully with ID:', notificationRef.id);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Get all notifications for admin - FIXED VERSION WITHOUT COMPOSITE INDEX
export const getAllNotifications = async () => {
  try {
    console.log('Fetching all notifications...');
    
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    // Simple query without orderBy to avoid composite index
    const snapshot = await getDocs(notificationsRef);
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt in JavaScript instead of Firestore query
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime; // Newest first
    });
    
    console.log('Found notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Subscribe to notifications for users (not admin) - FIXED VERSION WITHOUT COMPOSITE INDEX
export const subscribeToUserNotifications = (userId, callback) => {
  console.log('Setting up user notifications subscription for:', userId);
  
  // Skip for admin user
  if (!userId || userId === 'admin' || userId === 'vivaan.hooda@gmail.com') {
    console.log('Skipping notifications for admin');
    return () => {};
  }
  
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  // Simple query - only filter by isActive to avoid composite index
  const q = query(notificationsRef, where('isActive', '==', true));
  
  return onSnapshot(q, (snapshot) => {
    try {
      const notifications = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const readBy = data.readBy || [];
        
        // Only show notifications that this user hasn't read/dismissed
        if (!readBy.includes(userId)) {
          notifications.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      // Sort by createdAt in JavaScript instead of Firestore query
      notifications.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime; // Newest first
      });
      
      console.log('Active notifications for user:', userId, 'Count:', notifications.length);
      callback(notifications);
    } catch (error) {
      console.error('Error in notifications subscription:', error);
      callback([]);
    }
  }, (error) => {
    console.error('Notifications subscription error:', error);
    callback([]);
  });
};

// Mark notification as read by user (dismiss)
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    console.log('Marking notification as read:', notificationId, 'for user:', userId);
    
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    const notificationSnap = await getDoc(notificationRef);
    
    if (notificationSnap.exists()) {
      const data = notificationSnap.data();
      const readBy = data.readBy || [];
      
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await updateDoc(notificationRef, { readBy });
        console.log('Notification marked as read successfully');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Delete notification completely (admin function)
export const deleteNotification = async (notificationId) => {
  try {
    console.log('Deleting notification:', notificationId);
    
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await deleteDoc(notificationRef);
    
    console.log('Notification deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Deactivate notification (admin function)
export const deactivateNotification = async (notificationId) => {
  try {
    console.log('Deactivating notification:', notificationId);
    
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, { 
      isActive: false,
      deactivatedAt: serverTimestamp()
    });
    
    console.log('Notification deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating notification:', error);
    throw error;
  }
};

// ADMIN FUNCTIONS

// Get game settings
export const getGameSettings = async () => {
  try {
    console.log('Fetching game settings...');
    const settingsRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      console.log('Game settings found:', settingsSnap.data());
      return settingsSnap.data();
    } else {
      console.log('No game settings found');
      return null;
    }
  } catch (error) {
    console.error('Error getting game settings:', error);
    throw error;
  }
};

// Update game settings
export const updateGameSettings = async (updates) => {
  try {
    console.log('Updating game settings with:', updates);
    const settingsRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global');
    await updateDoc(settingsRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
    console.log('Game settings updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating game settings:', error);
    throw error;
  }
};

// Get all teams (admin function)
export const getAllTeams = async () => {
  try {
    console.log('Fetching all teams...');
    const teamsRef = collection(db, COLLECTIONS.TEAMS);
    const teamsSnapshot = await getDocs(teamsRef);
    
    const teams = [];
    teamsSnapshot.docs.forEach(doc => {
      teams.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Found teams:', teams.length);
    return teams;
  } catch (error) {
    console.error('Error fetching all teams:', error);
    throw error;
  }
};

// Get all game states (admin function)
export const getAllGameStates = async () => {
  try {
    console.log('Fetching all game states...');
    const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE);
    const gameStatesSnapshot = await getDocs(gameStatesRef);
    
    const gameStates = [];
    gameStatesSnapshot.docs.forEach(doc => {
      gameStates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Found game states:', gameStates.length);
    return gameStates;
  } catch (error) {
    console.error('Error fetching all game states:', error);
    throw error;
  }
};

// Delete team and associated data (admin function)
export const deleteTeam = async (teamId) => {
  try {
    console.log('Deleting team:', teamId);
    
    // Delete team document
    const teamRef = doc(db, COLLECTIONS.TEAMS, teamId);
    await deleteDoc(teamRef);
    
    // Delete associated game state
    const gameStateRef = doc(db, COLLECTIONS.GAME_STATE, teamId);
    await deleteDoc(gameStateRef);
    
    console.log('Team deleted successfully:', teamId);
    return true;
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
};

// Reset all teams except admin (admin function)
export const resetAllTeams = async (adminEmail = 'vivaan.hooda@gmail.com') => {
  try {
    console.log('Starting reset of all teams except admin...');
    
    // Get all teams
    const teamsRef = collection(db, COLLECTIONS.TEAMS);
    const teamsQuery = query(teamsRef, where('teamLeaderEmail', '!=', adminEmail));
    const teamsSnapshot = await getDocs(teamsQuery);
    
    // Get all game states
    const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE);
    const gameStatesSnapshot = await getDocs(gameStatesRef);
    
    // Create array of team IDs to exclude (admin teams)
    const adminTeamIds = [];
    const allTeamsSnapshot = await getDocs(teamsRef);
    allTeamsSnapshot.docs.forEach(doc => {
      if (doc.data().teamLeaderEmail === adminEmail) {
        adminTeamIds.push(doc.id);
      }
    });
    
    // Delete operations
    const deletePromises = [];
    
    // Delete team documents (non-admin)
    teamsSnapshot.docs.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    // Delete game state documents (non-admin)
    gameStatesSnapshot.docs.forEach(doc => {
      if (!adminTeamIds.includes(doc.id)) {
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    await Promise.all(deletePromises);
    
    console.log(`Successfully deleted ${teamsSnapshot.docs.length} teams and their game states`);
    return {
      teamsDeleted: teamsSnapshot.docs.length,
      gameStatesDeleted: gameStatesSnapshot.docs.length - adminTeamIds.length
    };
  } catch (error) {
    console.error('Error resetting all teams:', error);
    throw error;
  }
};

// Get team statistics (admin function)
export const getTeamStatistics = async () => {
  try {
    console.log('Fetching team statistics...');
    
    const teams = await getAllTeams();
    const gameStates = await getAllGameStates();
    
    const stats = {
      totalTeams: teams.length,
      totalRegisteredTeams: teams.filter(team => team.teamLeaderEmail !== 'vivaan.hooda@gmail.com').length,
      activeTeams: gameStates.filter(state => 
        state.lastActivity && 
        (new Date() - state.lastActivity.toDate()) < 300000 // Active in last 5 minutes
      ).length,
      completedTeams: gameStates.filter(state => state.isGameComplete).length,
      averageScore: gameStates.length > 0 
        ? Math.round(gameStates.reduce((sum, state) => sum + (state.score || 0), 0) / gameStates.length)
        : 0,
      topScore: gameStates.length > 0 
        ? Math.max(...gameStates.map(state => state.score || 0))
        : 0,
      totalChallengesCompleted: gameStates.reduce((sum, state) => 
        sum + (state.completedChallenges ? state.completedChallenges.length : 0), 0
      )
    };
    
    console.log('Team statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    throw error;
  }
};

// Pause/Resume game
export const pauseGame = async () => {
  try {
    const now = new Date();
    await updateGameSettings({
      isPaused: true,
      pausedAt: now
    });
    console.log('Game paused successfully');
    return true;
  } catch (error) {
    console.error('Error pausing game:', error);
    throw error;
  }
};

export const resumeGame = async (totalPauseTime) => {
  try {
    await updateGameSettings({
      isPaused: false,
      pausedAt: null,
      totalPauseTime: totalPauseTime
    });
    console.log('Game resumed successfully');
    return true;
  } catch (error) {
    console.error('Error resuming game:', error);
    throw error;
  }
};

// Set game active/inactive
export const setGameActive = async (isActive) => {
  try {
    await updateGameSettings({
      isGameActive: isActive
    });
    console.log(`Game ${isActive ? 'activated' : 'deactivated'} successfully`);
    return true;
  } catch (error) {
    console.error(`Error ${isActive ? 'activating' : 'deactivating'} game:`, error);
    throw error;
  }
};

// Update game start time
export const updateGameStartTime = async (startTime) => {
  try {
    await updateGameSettings({
      gameStartTime: startTime
    });
    console.log('Game start time updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating game start time:', error);
    throw error;
  }
};

// Update game duration
export const updateGameDuration = async (duration) => {
  try {
    await updateGameSettings({
      gameDuration: duration
    });
    console.log('Game duration updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating game duration:', error);
    throw error;
  }
};