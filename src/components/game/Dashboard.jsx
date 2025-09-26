import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getGameState, updateGameState, subscribeToGameSettings, getAllNotifications } from '../../firebase/collections'
import { getChallengeById } from '../../utils/gameUtils' // Added import
import { MapPin, Users, Trophy, Clock, Play, Pause, LogOut, Target, Zap, Award, Activity, Bell, History, AlertTriangle, Smartphone, ChevronDown, ChevronUp } from 'lucide-react'
import { formatTime, getGameTimeRemaining } from '../../utils/gameUtils'
import NotificationHistory from '../common/NotificationHistory'

const Dashboard = () => {
  const { currentUser, teamData, logout } = useAuth()
  const navigate = useNavigate()
  
  const [gameState, setGameState] = useState(null)
  const [gameSettings, setGameSettings] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timeUntilStart, setTimeUntilStart] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [gameOverShown, setGameOverShown] = useState(false)
  const [showNotificationHistory, setShowNotificationHistory] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  
  // Added states for correct challenge type counting
  const [correctedPicturesChallengesCompleted, setCorrectedPicturesChallengesCompleted] = useState(0)
  const [correctedRiddleChallengesCompleted, setCorrectedRiddleChallengesCompleted] = useState(0)
  
  const scoreCounterRef = useRef(null)

  // Department mapping function
  const getDepartmentShortForm = (fullDepartment) => {
    const departmentMap = {
      'Computer Science & Engineering (AIML)': 'AIML',
      'Computer Science & Engineering': 'CSE',
      'Computer Science & Engineering (Data Science)': 'CD',
      'Computer Science & Engineering (Cyber Security)': 'CY',
      'Electronics & Communication Engineering': 'ECE',
      'Electrical & Electronics Engineering': 'EEE',
      'Electronics & Telecommunication Engineering': 'ET',
      'Mechanical Engineering': 'ME',
      'Aerospace Engineering': 'AS',
      'Chemical Engineering': 'CH',
      'Civil Engineering': 'CV',
      'Biotechnology': 'BT',
      'Industrial Engineering & Management': 'IEM'
    }
    return departmentMap[fullDepartment] || fullDepartment
  }

  // Calculate challenge type statistics correctly - NEW LOGIC FROM GAME.JSX
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

  // Load notification count
  useEffect(() => {
    const loadNotificationCount = async () => {
      if (!currentUser?.uid || currentUser.email === 'vivaan.hooda@gmail.com') return
      
      try {
        const allNotifications = await getAllNotifications()
        setNotificationCount(allNotifications.length)
      } catch (error) {
        console.error('Error loading notification count:', error)
      }
    }

    loadNotificationCount()
  }, [currentUser])

  // Check if game has started
  const hasGameStarted = () => {
    if (!gameSettings?.gameStartTime) return false
    return Date.now() >= gameSettings.gameStartTime.toMillis()
  }

  // Load game state and settings
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const state = await getGameState(currentUser.uid)
        setGameState(state)
        setLoading(false)
        
        // Animate score counter
        if (state?.score) {
          animateScore(state.score)
        }
      } catch (error) {
        console.error('Error loading game state:', error)
        setLoading(false)
      }
    }

    if (currentUser) {
      loadGameData()
    }
  }, [currentUser])

  // Subscribe to game settings for timer
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
        
        // Only show game over once and only if game has actually started
        if (remaining <= 0 && !gameOverShown && hasGameStarted()) {
          setGameOverShown(true)
          alert('Game Over! Time\'s up!')
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameSettings, gameOverShown, hasGameStarted])

  // Reset game over flag when game restarts
  useEffect(() => {
    if (gameSettings?.isGameActive && timeRemaining > 0) {
      setGameOverShown(false)
    }
  }, [gameSettings?.isGameActive, timeRemaining])

  // Animate score counter - Fixed to handle edge cases
  const animateScore = (targetScore) => {
    if (!targetScore || targetScore === animatedScore) return
    
    const duration = 2000
    const startTime = Date.now()
    const startScore = animatedScore

    const updateScore = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const currentScore = Math.floor(startScore + (targetScore - startScore) * progress)
      
      setAnimatedScore(currentScore)
      
      if (progress < 1) {
        requestAnimationFrame(updateScore)
      }
    }
    
    updateScore()
  }

  // Visibility animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleStartGame = () => {
    navigate('/game')
  }

  const handleViewLeaderboard = () => {
    navigate('/leaderboard')
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleShowNotifications = () => {
    setShowNotificationHistory(true)
  }

  // Safe calculations with fallbacks - UPDATED TO USE CORRECT COUNTERS
  const completedChallenges = gameState?.completedChallenges || []
  const progressPercentage = completedChallenges.length ? (completedChallenges.length / 40) * 100 : 0
  // Use the corrected counters instead of the old logic
  const picturesCompleted = correctedPicturesChallengesCompleted
  const riddlesCompleted = correctedRiddleChallengesCompleted

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm sm:text-base">Loading command center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-gray-900">
      {/* Navigation Header */}
      <nav className="relative z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Command Center</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Single Device Login Notice */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <Smartphone className="h-4 w-4 text-orange-400" />
                <span className="text-orange-300 text-xs font-medium">Single Device Login</span>
              </div>

              {/* Notification History Button - Only for non-admin users */}
              {currentUser && currentUser.email !== 'vivaan.hooda@gmail.com' && (
                <button
                  onClick={handleShowNotifications}
                  className="relative flex items-center px-3 sm:px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300 group text-sm sm:text-base"
                >
                  <Bell className="h-4 w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Notifications</span>
                  {notificationCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{notificationCount > 9 ? '9+' : notificationCount}</span>
                    </div>
                  )}
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 sm:px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300 group text-sm sm:text-base"
              >
                <LogOut className="h-4 w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-4">
            Team: {teamData?.teamName || 'Unknown Team'}
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-gray-300">
            Your digital treasure hunting command center
          </p>
          
          {/* Status Indicator */}
          <div className="flex items-center justify-center mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700/50">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse ${gameSettings?.isGameActive ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-white text-xs sm:text-sm font-medium">
                {gameSettings?.isGameActive ? 'System Online' : 'System Paused'}
              </span>
            </div>
          </div>

          {/* Single Device Notice - Mobile Version */}
          <div className="sm:hidden mt-4">
            <div className="flex items-center justify-center space-x-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg mx-auto w-fit">
              <Smartphone className="h-4 w-4 text-orange-400" />
              <span className="text-orange-300 text-xs font-medium">Single Device Login Only</span>
            </div>
          </div>
        </div>

        {/* Game Timer */}
        {gameSettings?.isGameActive && (
          <div className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-700/50 shadow-2xl transition-all duration-700 ${isVisible ? 'scale-100' : 'scale-95'}`}>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-400 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 sm:w-12 sm:h-12 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide mb-1">
                  {timeUntilStart > 0 ? 'Mission Starts In' : 'Mission Time Remaining'}
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-mono font-bold text-white tracking-wider">
                  {timeUntilStart > 0 ? formatTime(timeUntilStart) : formatTime(timeRemaining)}
                </p>
              </div>
              
              {gameSettings.isPaused && (
                <div className="flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500/20 border border-orange-500/50 rounded-full">
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <span className="text-orange-400 font-medium text-xs sm:text-sm">Mission Paused</span>
                </div>
              )}
            </div>
            
            {/* Time Progress Bar */}
            <div className="mt-4 sm:mt-6">
              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 relative ${
                    timeUntilStart > 0 
                      ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500' 
                      : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500'
                  }`}
                  style={{ 
                    width: timeUntilStart > 0 
                      ? `${gameSettings.gameStartTime ? Math.max(0, Math.min(100, ((Date.now() - (gameSettings.gameStartTime.toMillis() - (gameSettings.gameStartTime.toMillis() - (Date.now() - timeUntilStart)))) / timeUntilStart) * 100)) : 0}%`
                      : `${gameSettings.gameDuration ? Math.max(0, Math.min(100, ((gameSettings.gameDuration - timeRemaining) / gameSettings.gameDuration) * 100)) : 0}%`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Mission Progress - Now First */}
          <div className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-gray-700/50 shadow-2xl transition-all duration-700 hover:scale-[1.02] ${isVisible ? 'translate-x-0' : 'translate-x-10'}`}>
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                <Trophy className="w-4 h-4 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white">Mission Progress</h3>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide mb-1 sm:mb-2">Current Score</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  {animatedScore}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Challenges Completed</p>
                  <p className="text-lg sm:text-xl font-bold text-white">
                    {completedChallenges.length} / 40
                  </p>
                </div>
                
                <div className="w-full bg-gray-700/50 rounded-full h-3 sm:h-4 overflow-hidden mb-3 sm:mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 relative"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-3 sm:p-4 text-center">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Pictures</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{picturesCompleted}/20</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-3 sm:p-4 text-center">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Riddles</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{riddlesCompleted}/20</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Information - Now Second */}
          <div className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-gray-700/50 shadow-2xl transition-all duration-700 hover:scale-[1.02] ${isVisible ? 'translate-x-0' : '-translate-x-10'}`}>
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                <Users className="w-4 h-4 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white">Team {teamData?.teamName || 'Unknown'}</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Team Leader Info - Always visible */}
              <div className="bg-gray-700/30 rounded-xl p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Team Leader</p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1">
                  <p className="text-white font-semibold text-sm sm:text-lg">{teamData?.teamLeaderName || 'N/A'}</p>
                  <div className="text-xs sm:text-sm">
                    <p className="text-cyan-400 font-mono">{teamData?.teamLeaderMobile || 'N/A'}</p>
                    <p className="text-gray-400">{getDepartmentShortForm(teamData?.teamLeaderDepartment) || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {/* Team Members - Dropdown */}
              <div className="bg-gray-700/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Team Members ({teamData?.totalMembers || 0})</p>
                  <button
                    onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                    className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors p-1"
                  >
                    {showTeamDropdown ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Show member count when collapsed */}
                {!showTeamDropdown && (
                  <div className="text-center py-2">
                    <p className="text-white text-sm">
                      {teamData?.teamMembers?.length || 0} members
                    </p>
                    <p className="text-gray-400 text-xs">Click to view details</p>
                  </div>
                )}
                
                {/* Team members list - only show when expanded */}
                {showTeamDropdown && (
                  <div className="grid grid-cols-1 gap-2 animate-slideInDown">
                    {teamData?.teamMembers?.map((member, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-600/20 rounded-lg hover:bg-gray-600/30 transition-colors">
                        <span className="text-white font-medium text-sm sm:text-base">{member.name}</span>
                        <div className="text-xs sm:text-sm">
                          <span className="text-cyan-400 font-mono">{member.mobile}</span>
                          <span className="text-gray-400 ml-2 sm:block">{getDepartmentShortForm(member.department)}</span>
                        </div>
                      </div>
                    )) || (
                      <div className="text-gray-400 text-center py-4 text-sm">No team members loaded</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <button
            onClick={handleStartGame}
            disabled={!gameSettings?.isGameActive || gameState?.isGameComplete || timeUntilStart > 0}
            className={`
              group relative overflow-hidden px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r 
              ${timeUntilStart > 0 || !gameSettings?.isGameActive || gameState?.isGameComplete
                ? 'from-gray-600 to-gray-700 cursor-not-allowed' 
                : 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800'
              }
              text-white rounded-2xl font-bold text-lg sm:text-xl 
              transition-all duration-300 transform 
              ${timeUntilStart > 0 || !gameSettings?.isGameActive || gameState?.isGameComplete
                ? '' 
                : 'hover:scale-[1.02] shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40'
              }
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
            `}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="relative z-10 flex items-center justify-center">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm sm:text-xl">
                {gameState?.isGameComplete 
                  ? 'Mission Complete!' 
                  : timeUntilStart > 0 
                    ? 'Mission Preparing...' 
                    : 'Continue Mission'
                }
              </span>
            </div>
            {timeUntilStart === 0 && gameSettings?.isGameActive && !gameState?.isGameComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            )}
          </button>

          <button
            onClick={handleViewLeaderboard}
            className={`
              group relative overflow-hidden px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-700 
              hover:from-purple-700 hover:to-pink-800 text-white rounded-2xl font-bold text-lg sm:text-xl 
              transition-all duration-300 transform hover:scale-[1.02]
              shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
            `}
            style={{ transitionDelay: '500ms' }}
          >
            <div className="relative z-10 flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm sm:text-xl">View Leaderboard</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </button>
        </div>

        {/* Status Messages */}
        {!gameSettings?.isGameActive && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <Pause className="text-orange-400 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" />
              <p className="text-orange-400 font-semibold text-sm sm:text-lg">
                Mission temporarily suspended by command
              </p>
            </div>
          </div>
        )}

        {gameState?.isGameComplete && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <Award className="text-green-400 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <p className="text-green-400 font-semibold text-sm sm:text-lg">
                Mission accomplished! All challenges completed successfully!
              </p>
            </div>
          </div>
        )}

        {/* Single Device Login Warning */}
        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
          <div className="flex items-start">
            <AlertTriangle className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <p className="text-orange-300 font-medium text-sm sm:text-base mb-1">Device Login Policy</p>
              <p className="text-orange-400 text-xs sm:text-sm">
                Only <strong>1 device is allowed to login at a time</strong>. Ensure your team uses only one device.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { 
              icon: MapPin, 
              label: 'Current Challenge', 
              value: (gameState?.currentChallenge || 0) + 1, 
              color: 'from-blue-500 to-cyan-500' 
            },
            { 
              icon: Trophy, 
              label: 'Total Score', 
              value: animatedScore, 
              color: 'from-yellow-500 to-orange-500' 
            },
            { 
              icon: Clock, 
              label: 'Time Active', 
              value: gameState?.startTime ? 
                formatTime(Date.now() - gameState.startTime.toMillis()).slice(0, 5) : 
                '00:00', 
              color: 'from-green-500 to-emerald-500' 
            },
            { 
              icon: Activity, 
              label: 'Progress', 
              value: `${Math.round(progressPercentage)}%`, 
              color: 'from-purple-500 to-pink-500' 
            }
          ].map((stat, index) => (
            <div
              key={index}
              className={`
                bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-3 sm:p-6 
                border border-gray-700/50 text-center hover:scale-105 transition-all duration-300
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
              `}
              style={{ transitionDelay: `${600 + index * 100}ms` }}
            >
              <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg`}>
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notification History Modal - Positioned at top */}
      <div className={`fixed inset-x-0 top-0 z-50 transform transition-transform duration-300 ${showNotificationHistory ? 'translate-y-0' : '-translate-y-full'}`}>
        <NotificationHistory 
          isOpen={showNotificationHistory} 
          onClose={() => setShowNotificationHistory(false)} 
        />
      </div>
    </div>
  )
}

export default Dashboard