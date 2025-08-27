import { useState, useEffect, useContext, createContext } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { createTeam, getTeamData, initializeGameState } from '../firebase/collections.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Register new team
  const register = async (email, password, teamInfo) => {
    try {
      setError(null);
      setLoading(true);

      // Validate team members (3-4 members)
      if (teamInfo.teamMembers.length < 3 || teamInfo.teamMembers.length > 4) {
        throw new Error('Team must have 3-4 members');
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create team document - Include team name and team leader admission number
      const teamData = {
        teamName: teamInfo.teamName,
        teamLeaderEmail: email,
        teamLeaderName: teamInfo.teamLeaderName,
        teamLeaderAdmissionNumber: teamInfo.teamLeaderAdmissionNumber,
        teamMembers: teamInfo.teamMembers,
        totalMembers: teamInfo.teamMembers.length
      };

      const teamCreated = await createTeam(user.uid, teamData);
      if (!teamCreated) {
        throw new Error('Failed to create team data');
      }

      // Initialize game state
      const gameStateInitialized = await initializeGameState(user.uid);
      if (!gameStateInitialized) {
        throw new Error('Failed to initialize game state');
      }

      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login existing team
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setTeamData(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Load team data when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Load team data
        try {
          const data = await getTeamData(user.uid);
          setTeamData(data);
        } catch (error) {
          console.error('Error loading team data:', error);
          setError('Failed to load team data');
        }
      } else {
        setTeamData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    teamData,
    loading,
    error,
    register,
    login,
    logout,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};