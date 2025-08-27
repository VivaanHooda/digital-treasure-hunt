import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getLeaderboard, subscribeToGameSettings } from '../../firebase/collections'
import { 
  Trophy, 
  Medal, 
  Award, 
  Clock, 
  Users, 
  ArrowLeft,
  RefreshCw,
  Crown
} from 'lucide-react'
import { formatTime } from '../../utils/gameUtils'

const Leaderboard = () => {
  const navigate = useNavigate()
  const { currentUser, teamData } = useAuth()
  
  const [leaderboardData, setLeaderboardData] = useState([])
  const [gameSettings, setGameSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Subscribe to game settings
  useEffect(() => {
    const unsubscribe = subscribeToGameSettings((doc) => {
      if (doc.exists()) {
        setGameSettings(doc.data())
      }
    })

    return unsubscribe
  }, [])

  // Load leaderboard data
  const loadLeaderboard = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      
      const data = await getLeaderboard()
      setLeaderboardData(data)
      setLastUpdate(new Date())
      
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadLeaderboard()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeaderboard()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const handleRefresh = () => {
    loadLeaderboard(true)
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" />
      case 2:
        return <Medal className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6" />
      case 3:
        return <Award className="text-amber-600 w-5 h-5 sm:w-6 sm:h-6" />
      default:
        return <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-600 rounded-full text-white text-xs sm:text-sm font-bold">{rank}</div>
    }
  }

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'border-yellow-400 bg-yellow-400/10'
      case 2:
        return 'border-gray-400 bg-gray-400/10'
      case 3:
        return 'border-amber-600 bg-amber-600/10'
      default:
        return 'border-gray-600 bg-gray-700/20'
    }
  }

  const isCurrentTeam = (teamId) => {
    return teamId === currentUser?.uid
  }

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'Not started'
    const start = startTime?.toDate ? startTime.toDate() : startTime
    const end = endTime?.toDate ? endTime.toDate() : new Date()
    const duration = end.getTime() - start.getTime()
    return formatTime(duration)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm sm:text-base">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Navigation Header */}
      <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Dashboard</span>
              <span className="xs:hidden">Back</span>
            </button>
            
            <h1 className="text-lg sm:text-xl font-bold text-white">Leaderboard</h1>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-2 sm:px-3 py-1 sm:py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="ml-1 sm:ml-2 hidden xs:inline">Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header Stats */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">Team Rankings</h2>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg mb-4 sm:mb-6">
            Live leaderboard - updates every 30 seconds
          </p>
          
          {lastUpdate && (
            <p className="text-gray-400 text-xs sm:text-sm">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Game Status Banner */}
        {gameSettings && (
          <div className={`mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl border ${
            gameSettings.isGameActive 
              ? 'bg-green-500/20 border-green-500/50' 
              : 'bg-orange-500/20 border-orange-500/50'
          }`}>
            <div className="flex items-center justify-center">
              {gameSettings.isGameActive ? (
                <>
                  <Trophy className="text-green-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-green-400 font-medium text-sm sm:text-base">Game is Active</span>
                </>
              ) : (
                <>
                  <Clock className="text-orange-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-orange-400 font-medium text-sm sm:text-base">Game is Paused</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboardData.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-8 sm:p-12 text-center border border-gray-700">
            <Users className="text-gray-400 mx-auto mb-4 w-10 h-10 sm:w-12 sm:h-12" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Be the first team to start the treasure hunt!
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {leaderboardData.map((team, index) => {
              const rank = index + 1
              const isCurrent = isCurrentTeam(team.id)
              
              return (
                <div
                  key={team.id}
                  className={`
                    bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border transition-all
                    ${isCurrent 
                      ? 'border-blue-400 bg-blue-400/10 ring-2 ring-blue-400/20' 
                      : getRankColor(rank)
                    }
                  `}
                >
                  {/* Mobile Layout */}
                  <div className="block sm:hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getRankIcon(rank)}
                        <div>
                          <h3 className="text-base font-bold text-white truncate max-w-32">
                            {team.teamInfo?.teamName || team.teamName || team.displayName || team.name || 'Team Name'}
                          </h3>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-400">
                          {team.score || 0}
                        </p>
                        <p className="text-gray-400 text-xs">Points</p>
                      </div>
                    </div>

                    {/* Mobile Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-gray-700/30 rounded-lg py-2">
                        <p className="text-sm font-semibold text-white">
                          {team.completedChallenges?.length || 0}/40
                        </p>
                        <p className="text-gray-400 text-xs">Done</p>
                      </div>

                      <div className="text-center bg-gray-700/30 rounded-lg py-2">
                        <p className="text-xs font-medium text-white">
                          {formatDuration(team.startTime, team.endTime)}
                        </p>
                        <p className="text-gray-400 text-xs">Time</p>
                      </div>

                      <div className="text-center bg-gray-700/30 rounded-lg py-2">
                        <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                          team.isGameComplete 
                            ? 'bg-green-400' 
                            : team.lastActivity && (new Date() - team.lastActivity.toDate()) < 300000
                              ? 'bg-blue-400' 
                              : 'bg-gray-400'
                        }`}></div>
                        <p className="text-gray-400 text-xs">
                          {team.isGameComplete 
                            ? 'Done' 
                            : team.lastActivity && (new Date() - team.lastActivity.toDate()) < 300000
                              ? 'Live' 
                              : 'Away'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:block">
                    <div className="flex items-center justify-between">
                      {/* Rank and Team Info */}
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(rank)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-white">
                              {team.teamInfo?.teamName || team.teamName || team.displayName || team.name || 'Team Name'}
                            </h3>
                            {isCurrent && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                Your Team
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center space-x-8">
                        {/* Score */}
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-400">
                            {team.score || 0}
                          </p>
                          <p className="text-gray-400 text-xs">Points</p>
                        </div>

                        {/* Challenges Completed */}
                        <div className="text-center">
                          <p className="text-lg font-semibold text-white">
                            {team.completedChallenges?.length || 0}/40
                          </p>
                          <p className="text-gray-400 text-xs">Completed</p>
                        </div>

                        {/* Time Played */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-white">
                            {formatDuration(team.startTime, team.endTime)}
                          </p>
                          <p className="text-gray-400 text-xs">Duration</p>
                        </div>

                        {/* Status */}
                        <div className="text-center">
                          <div className={`w-3 h-3 rounded-full ${
                            team.isGameComplete 
                              ? 'bg-green-400' 
                              : team.lastActivity && (new Date() - team.lastActivity.toDate()) < 300000
                                ? 'bg-blue-400' 
                                : 'bg-gray-400'
                          }`}></div>
                          <p className="text-gray-400 text-xs mt-1">
                            {team.isGameComplete 
                              ? 'Complete' 
                              : team.lastActivity && (new Date() - team.lastActivity.toDate()) < 300000
                                ? 'Active' 
                                : 'Inactive'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 sm:mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                          rank === 3 ? 'bg-gradient-to-r from-amber-500 to-amber-700' :
                          'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}
                        style={{ 
                          width: `${((team.completedChallenges?.length || 0) / 40) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats - Mobile Optimized Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mt-6 sm:mt-8">
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-gray-700 text-center">
            <Users className="text-blue-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />
            <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Total Teams</h3>
            <p className="text-xl sm:text-3xl font-bold text-blue-400">{leaderboardData.length}</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-gray-700 text-center">
            <Trophy className="text-yellow-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />
            <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Top Score</h3>
            <p className="text-xl sm:text-3xl font-bold text-yellow-400">
              {leaderboardData.length > 0 ? leaderboardData[0]?.score || 0 : 0}
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-gray-700 text-center col-span-2 sm:col-span-1">
            <Award className="text-green-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />
            <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Completed Teams</h3>
            <p className="text-xl sm:text-3xl font-bold text-green-400">
              {leaderboardData.filter(team => team.isGameComplete).length}
            </p>
          </div>
        </div>

        {/* Your Team Highlight */}
        {currentUser && teamData && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-blue-500/30 mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Your Team Position</h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Team: {teamData.teamInfo?.teamName || teamData.teamName}
                </p>
              </div>
              
              <div className="w-full sm:w-auto">
                {(() => {
                  const teamRank = leaderboardData.findIndex(team => team.id === currentUser.uid) + 1
                  const currentTeamData = leaderboardData.find(team => team.id === currentUser.uid)
                  
                  if (teamRank === 0) {
                    return (
                      <div className="text-center sm:text-right">
                        <p className="text-gray-400 text-base sm:text-lg">Not yet ranked</p>
                        <p className="text-gray-500 text-sm">Complete a challenge to appear</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="flex items-center justify-center sm:justify-end space-x-4 sm:space-x-6">
                      <div className="text-center">
                        <p className="text-lg sm:text-2xl font-bold text-white">#{teamRank}</p>
                        <p className="text-gray-400 text-xs sm:text-sm">Rank</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg sm:text-2xl font-bold text-yellow-400">{currentTeamData?.score || 0}</p>
                        <p className="text-gray-400 text-xs sm:text-sm">Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm sm:text-lg font-semibold text-white">
                          {currentTeamData?.completedChallenges?.length || 0}/40
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm">Done</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 p-4">
          <p className="text-gray-400 text-xs sm:text-sm">
            Rankings update automatically every 30 seconds
          </p>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard