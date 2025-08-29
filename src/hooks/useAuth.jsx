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

  // Register new team or admin
  const register = async (email, password, teamInfo = null) => {
    try {
      setError(null);
      setLoading(true);

      // Check if this is admin registration
      if (email === 'vivaan.hooda@gmail.com') {
        console.log('Creating admin account...');
        // Create Firebase auth user for admin without team data
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Admin account created successfully');
        return userCredential.user;
      }

      // Regular team registration
      if (!teamInfo) {
        throw new Error('Team information is required for regular registration');
      }

      // Validate team members (exactly 3 members, total 4 including leader)
      if (teamInfo.teamMembers.length !== 3) {
        throw new Error('Team must have exactly 3 members (4 total including team leader)');
      }

      // Validate that all team members have required fields
      const invalidMembers = teamInfo.teamMembers.filter(member => 
        !member.name.trim() || !member.mobile.trim() || !member.department.trim()
      );
      
      if (invalidMembers.length > 0) {
        throw new Error('All team members must have name, mobile number, and department filled');
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create team document with mobile numbers and departments
      const teamData = {
        teamName: teamInfo.teamName,
        teamLeaderEmail: email,
        teamLeaderName: teamInfo.teamLeaderName,
        teamLeaderMobile: teamInfo.teamLeaderMobile,
        teamLeaderDepartment: teamInfo.teamLeaderDepartment,
        teamMembers: teamInfo.teamMembers.map(member => ({
          name: member.name.trim(),
          mobile: member.mobile.trim(),
          department: member.department.trim()
        })),
        totalMembers: 4 // Always 4 (leader + 3 members)
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

  // Login existing team or admin
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
        // Check if this is admin user
        if (user.email === 'vivaan.hooda@gmail.com') {
          console.log('Admin user detected, skipping team data load');
          setTeamData(null); // Admin doesn't have team data
        } else {
          // Load team data for regular users
          try {
            const data = await getTeamData(user.uid);
            setTeamData(data);
          } catch (error) {
            console.error('Error loading team data:', error);
            setError('Failed to load team data');
          }
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