// Firebase Firestore Collections Schema and Helper Functions
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
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
  GAME_SETTINGS: 'gameSettings'
};

// Teams Collection Structure
/*
teams/{teamId} = {
  teamLeaderEmail: string,
  teamLeaderName: string,
  teamMembers: [
    { name: string, admissionNumber: string },
    { name: string, admissionNumber: string },
    ...
  ],
  createdAt: timestamp,
  totalMembers: number (3-4 max)
}
*/

// Game State Collection Structure  
/*
gameState/{teamId} = {
  currentChallenge: number (0-39, 0-29 pictures, 30-39 riddles),
  completedChallenges: [challengeIds],
  score: number,
  lastGuessTime: timestamp,
  canGuess: boolean,
  cooldownEnd: timestamp,
  startTime: timestamp,
  lastActivity: timestamp,
  lastCompletedTime: timestamp, // when last challenge was completed
  isGameComplete: boolean
}
*/

// Challenges Collection Structure
/*
challenges/{challengeId} = {
  id: number (0-39),
  type: 'picture' | 'riddle',
  title: string,
  description: string,
  imageUrl?: string, // for picture challenges
  targetLocation: {
    latitude: number,
    longitude: number,
    name: string
  },
  marginOfError: number, // in meters
  points: number,
  hint?: string
}
*/

// Leaderboard Collection Structure
/*
leaderboard/{teamId} = {
  teamName: string,
  score: number,
  completedChallenges: number,
  lastUpdate: timestamp,
  timeToComplete?: timestamp, // when they finished all challenges
  isComplete: boolean
}
*/

// Game Settings Collection Structure
/*
gameSettings/global = {
  gameStartTime: timestamp,
  gameDuration: number, // in milliseconds (2 hours)
  isPaused: boolean,
  pausedAt?: timestamp,
  totalPauseTime: number, // accumulated pause time
  isGameActive: boolean,
  maxTeamSize: number (4),
  minTeamSize: number (3)
}
*/

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