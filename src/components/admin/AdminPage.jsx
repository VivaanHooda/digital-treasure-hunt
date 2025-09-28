import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS, sendNotification, getAllNotifications, deactivateNotification, deleteNotification } from '../../firebase/collections'
import { switchChallengeDataSet, getCurrentDataSet } from '../../data/challengeData'
import { 
  Settings, 
  Clock, 
  Play, 
  Pause, 
  Users, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  ArrowLeft,
  Bell,
  Send,
  History,
  Eye,
  EyeOff,
  Settings2,
  Database,
  Lock,
  Download
} from 'lucide-react'

const AdminPage = () => {
  const navigate = useNavigate()
  const [gameSettings, setGameSettings] = useState(null)
  const [localStartTime, setLocalStartTime] = useState('') // Local state for datetime input
  const [localDuration, setLocalDuration] = useState(2) // Local state for duration input
  const [localHours, setLocalHours] = useState(2) // Local state for hours
  const [localMinutes, setLocalMinutes] = useState(0) // Local state for minutes
  const [hasChanges, setHasChanges] = useState(false) // Track if there are unsaved changes
  const [loading, setLoading] = useState(true)
  
  // Notification states
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationType, setNotificationType] = useState('info')
  const [sendingNotification, setSendingNotification] = useState(false)
  const [showNotificationHistory, setShowNotificationHistory] = useState(false)
  const [notificationHistory, setNotificationHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Challenge Data Switcher states
  const [showDataSwitcher, setShowDataSwitcher] = useState(false)
  const [switcherPassword, setSwitcherPassword] = useState('')
  const [currentDataSet, setCurrentDataSet] = useState('A')
  const [switchingData, setSwitchingData] = useState(false)
  const [showSwitcherModal, setShowSwitcherModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // CSV Download state
  const [downloadingCSV, setDownloadingCSV] = useState(false)

  // Load game settings
  useEffect(() => {
    const loadGameSettings = async () => {
      try {
        setLoading(true)
        const settingsRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global')
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data()
          setGameSettings(settings)
          setLocalStartTime(getDateTimeLocalValue(settings.gameStartTime))
          
          // Set duration in both formats
          const durationHours = (settings.gameDuration || 7200000) / 3600000
          setLocalDuration(durationHours)
          setLocalHours(Math.floor(durationHours))
          setLocalMinutes(Math.round((durationHours % 1) * 60))
        } else {
          // Create default settings with proper Firestore timestamp
          const defaultSettings = {
            gameStartTime: Timestamp.now(),
            gameDuration: 7200000, // 2 hours
            isPaused: false,
            pausedAt: null,
            totalPauseTime: 0,
            isGameActive: true,
            maxTeamSize: 4,
            minTeamSize: 3
          }
          await updateDoc(settingsRef, defaultSettings)
          setGameSettings(defaultSettings)
          setLocalStartTime(getDateTimeLocalValue(defaultSettings.gameStartTime))
          setLocalDuration(2)
          setLocalHours(2)
          setLocalMinutes(0)
        }
        setHasChanges(false)
      } catch (error) {
        console.error('Error loading game settings:', error)
        setError('Failed to load game settings')
      } finally {
        setLoading(false)
      }
    }

    loadGameSettings()
  }, [])

  // Load current dataset
  useEffect(() => {
    const loadCurrentDataSet = async () => {
      try {
        const current = await getCurrentDataSet()
        setCurrentDataSet(current)
      } catch (error) {
        console.error('Error loading current dataset:', error)
      }
    }
    
    loadCurrentDataSet()
  }, [])

  const updateGameSettings = async (updates) => {
    try {
      setUpdating(true)
      setError(null)
      
      const settingsRef = doc(db, COLLECTIONS.GAME_SETTINGS, 'global')
      await updateDoc(settingsRef, updates)
      
      setGameSettings(prev => ({ ...prev, ...updates }))
      setSuccess('Settings updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error updating game settings:', error)
      setError('Failed to update settings: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleStartTimeChange = (e) => {
    setLocalStartTime(e.target.value)
    setHasChanges(true)
  }

  const handleDurationChange = (e) => {
    setLocalDuration(parseFloat(e.target.value) || 2)
    setHasChanges(true)
  }

  const handleHoursChange = (e) => {
    const hours = Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
    setLocalHours(hours)
    setLocalDuration(hours + localMinutes / 60)
    setHasChanges(true)
  }

  const handleMinutesChange = (e) => {
    const minutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
    setLocalMinutes(minutes)
    setLocalDuration(localHours + minutes / 60)
    setHasChanges(true)
  }

  const handleSaveChanges = async () => {
    try {
      setUpdating(true)
      setError(null)

      const updates = {}

      // Update start time if changed
      const newStartTime = new Date(localStartTime)
      if (isNaN(newStartTime.getTime())) {
        setError('Invalid date format')
        return
      }
      updates.gameStartTime = Timestamp.fromDate(newStartTime)

      // Update duration using hours and minutes
      updates.gameDuration = (localHours * 3600 + localMinutes * 60) * 1000

      await updateGameSettings(updates)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving changes:', error)
      setError('Failed to save changes: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDiscardChanges = () => {
    setLocalStartTime(getDateTimeLocalValue(gameSettings?.gameStartTime))
    const durationHours = (gameSettings?.gameDuration || 7200000) / 3600000
    setLocalDuration(durationHours)
    setLocalHours(Math.floor(durationHours))
    setLocalMinutes(Math.round((durationHours % 1) * 60))
    setHasChanges(false)
    setError(null)
  }

  // Challenge Data Switcher Functions
  const handleSwitcherPasswordSubmit = () => {
    if (switcherPassword === 'SumukhaISGreat') {
      setShowDataSwitcher(true)
      setShowSwitcherModal(true)
      setSwitcherPassword('')
      setError(null)
    } else {
      setError('Incorrect password for data switcher')
      setSwitcherPassword('')
    }
  }

  const handleDataSetSwitch = async (newSet) => {
    try {
      setSwitchingData(true)
      setError(null)
      
      const success = await switchChallengeDataSet(newSet)
      if (success) {
        setCurrentDataSet(newSet)
        setSuccess(`Challenge data switched to Set ${newSet}`)
        setShowSwitcherModal(false)
        setShowDataSwitcher(false)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to switch challenge data')
      }
    } catch (error) {
      console.error('Error switching challenge data:', error)
      setError('Failed to switch challenge data: ' + error.message)
    } finally {
      setSwitchingData(false)
    }
  }

  // UPDATED CSV Download Function - Only changes are in this function
  const handleDownloadAttendanceReport = async () => {
    try {
      setDownloadingCSV(true)
      setError(null)

      console.log('Starting CSV download...')
      
      // Fetch all teams
      const teamsRef = collection(db, COLLECTIONS.TEAMS)
      const teamsSnapshot = await getDocs(teamsRef)
      
      console.log('Teams fetched:', teamsSnapshot.docs.length)

      // Prepare CSV data with updated headers
      const csvData = []
      const headers = [
        'Team ID',
        'Team Name',
        'Team Leader Name', 
        'Team Leader Email',
        'Team Leader Phone',
        'Team Leader Department',
        'Member 1 Name',
        'Member 1 Phone',
        'Member 1 Department',
        'Member 2 Name', 
        'Member 2 Phone',
        'Member 2 Department',
        'Member 3 Name',
        'Member 3 Phone',
        'Member 3 Department',
        'Registration Date'
      ]
      
      csvData.push(headers)

      // Process each team
      teamsSnapshot.docs.forEach(doc => {
        const teamData = doc.data()
        const teamMembers = teamData.teamMembers || []
        
        const row = [
          doc.id,
          teamData.teamName || '',
          teamData.teamLeaderName || '',
          teamData.teamLeaderEmail || '', // Only team leader's email
          teamData.teamLeaderMobile || '',
          teamData.teamLeaderDepartment || '',
          teamMembers[0]?.name || '',
          teamMembers[0]?.mobile || '', // Phone number instead of email
          teamMembers[0]?.department || '',
          teamMembers[1]?.name || '',
          teamMembers[1]?.mobile || '', // Phone number instead of email
          teamMembers[1]?.department || '',
          teamMembers[2]?.name || '',
          teamMembers[2]?.mobile || '', // Phone number instead of email
          teamMembers[2]?.department || '',
          teamData.createdAt?.toDate?.()?.toLocaleString() || teamData.createdAt || 'Unknown'
        ]
        
        csvData.push(row)
      })

      console.log('CSV data prepared, rows:', csvData.length)

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(field => {
          // Escape quotes and wrap in quotes if field contains comma, quote, or newline
          const fieldStr = String(field || '')
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return '"' + fieldStr.replace(/"/g, '""') + '"'
          }
          return fieldStr
        }).join(',')
      ).join('\n')

      console.log('CSV content created, length:', csvContent.length)

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        
        // Generate filename with current date
        const now = new Date()
        const dateStr = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0') + '_' + 
                       String(now.getHours()).padStart(2, '0') + '-' + 
                       String(now.getMinutes()).padStart(2, '0')
        
        link.setAttribute('download', `treasure_hunt_attendance_${dateStr}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        setSuccess(`Attendance report downloaded! (${csvData.length - 1} teams)`)
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError('Download not supported in this browser')
      }

    } catch (error) {
      console.error('Error downloading attendance report:', error)
      setError('Failed to download attendance report: ' + error.message)
    } finally {
      setDownloadingCSV(false)
    }
  }

  // Notification Functions
  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      setError('Please enter a notification message')
      return
    }

    try {
      setSendingNotification(true)
      setError(null)

      const notification = {
        message: notificationMessage.trim(),
        title: notificationTitle.trim() || 'Admin Notification',
        type: notificationType
      }

      await sendNotification(notification)
      
      setSuccess('Notification sent to all users!')
      setNotificationMessage('')
      setNotificationTitle('')
      setNotificationType('info')
      
      // Refresh history if it's open
      if (showNotificationHistory) {
        loadNotificationHistory()
      }
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error sending notification:', error)
      setError('Failed to send notification: ' + error.message)
    } finally {
      setSendingNotification(false)
    }
  }

  const loadNotificationHistory = async () => {
    try {
      setLoadingHistory(true)
      const history = await getAllNotifications()
      setNotificationHistory(history)
    } catch (error) {
      console.error('Error loading notification history:', error)
      setError('Failed to load notification history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleToggleNotificationHistory = () => {
    if (!showNotificationHistory) {
      loadNotificationHistory()
    }
    setShowNotificationHistory(!showNotificationHistory)
  }

  const handleDeactivateNotification = async (notificationId) => {
    try {
      await deactivateNotification(notificationId)
      setSuccess('Notification deactivated')
      loadNotificationHistory() // Refresh the history
      setTimeout(() => setSuccess(null), 2000)
    } catch (error) {
      console.error('Error deactivating notification:', error)
      setError('Failed to deactivate notification')
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
      setSuccess('Notification deleted permanently')
      loadNotificationHistory() // Refresh the history
      setTimeout(() => setSuccess(null), 2000)
    } catch (error) {
      console.error('Error deleting notification:', error)
      setError('Failed to delete notification')
    }
  }

  const handlePauseToggle = async () => {
    try {
      const now = Timestamp.now()
      
      if (gameSettings.isPaused) {
        // Unpause - add paused time to total
        let pauseDuration = 0
        if (gameSettings.pausedAt) {
          pauseDuration = now.toMillis() - gameSettings.pausedAt.toMillis()
        }
        
        await updateGameSettings({
          isPaused: false,
          pausedAt: null,
          totalPauseTime: (gameSettings.totalPauseTime || 0) + pauseDuration
        })
      } else {
        // Pause
        await updateGameSettings({
          isPaused: true,
          pausedAt: now
        })
      }
    } catch (error) {
      console.error('Error toggling pause:', error)
      setError('Failed to toggle pause state')
    }
  }

  const handleResetAllTeams = async () => {
    if (resetPassword !== 'snehalreddy') {
      setError('Incorrect password')
      return
    }

    try {
      setResetLoading(true)
      setError(null)

      // Get all teams except admin
      const teamsRef = collection(db, COLLECTIONS.TEAMS)
      const teamsQuery = query(teamsRef, where('teamLeaderEmail', '!=', 'vivaan.hooda@gmail.com'))
      const teamsSnapshot = await getDocs(teamsQuery)

      // Get all game states
      const gameStatesRef = collection(db, COLLECTIONS.GAME_STATE)
      const gameStatesSnapshot = await getDocs(gameStatesRef)

      // Get admin team IDs to preserve
      const allTeamsSnapshot = await getDocs(teamsRef)
      const adminTeamIds = []
      allTeamsSnapshot.docs.forEach(doc => {
        if (doc.data().teamLeaderEmail === 'vivaan.hooda@gmail.com') {
          adminTeamIds.push(doc.id)
        }
      })

      // Delete team documents (non-admin)
      const deletePromises = []
      teamsSnapshot.docs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref))
      })

      // Delete game state documents (non-admin)
      gameStatesSnapshot.docs.forEach(doc => {
        if (!adminTeamIds.includes(doc.id)) {
          deletePromises.push(deleteDoc(doc.ref))
        }
      })

      await Promise.all(deletePromises)

      setSuccess(`Successfully reset ${teamsSnapshot.docs.length} teams`)
      setShowResetModal(false)
      setResetPassword('')
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error('Error resetting teams:', error)
      setError('Failed to reset teams: ' + error.message)
    } finally {
      setResetLoading(false)
    }
  }

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getDateTimeLocalValue = (firestoreTimestamp) => {
    if (!firestoreTimestamp) return new Date().toISOString().slice(0, 16)
    
    try {
      // Handle both Firestore Timestamp and regular dates
      let date
      if (firestoreTimestamp.toDate) {
        date = firestoreTimestamp.toDate()
      } else if (firestoreTimestamp.toMillis) {
        date = new Date(firestoreTimestamp.toMillis())
      } else {
        date = new Date(firestoreTimestamp)
      }
      
      return date.toISOString().slice(0, 16)
    } catch (error) {
      console.error('Error converting timestamp:', error)
      return new Date().toISOString().slice(0, 16)
    }
  }

  const handleLogout = () => {
    // Clear admin session
    sessionStorage.removeItem('isAdmin')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <nav className="bg-gray-900/90 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-2 rounded-lg transition-all duration-300 group mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Back</span>
              </button>
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-red-500 mr-3" />
                <h1 className="text-xl font-bold text-white">Admin Control Panel</h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <XCircle className="text-red-400 mr-3" size={20} />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <CheckCircle className="text-green-400 mr-3" size={20} />
              <span className="text-green-300">{success}</span>
            </div>
          </div>
        )}

        {/* Game Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Game Active Status */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  gameSettings?.isGameActive ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {gameSettings?.isGameActive ? (
                    <Play className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="text-white font-semibold">Game Status</h3>
                  <p className="text-gray-400 text-sm">Overall game state</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                gameSettings?.isGameActive 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {gameSettings?.isGameActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>
          </div>

          {/* Pause Status */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  gameSettings?.isPaused ? 'bg-orange-500/20' : 'bg-blue-500/20'
                }`}>
                  {gameSettings?.isPaused ? (
                    <Pause className="w-6 h-6 text-orange-400" />
                  ) : (
                    <Play className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="text-white font-semibold">Pause Status</h3>
                  <p className="text-gray-400 text-sm">Game pause state</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                gameSettings?.isPaused 
                  ? 'bg-orange-500/20 text-orange-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {gameSettings?.isPaused ? 'PAUSED' : 'RUNNING'}
              </div>
            </div>
          </div>

          {/* Game Duration */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-white font-semibold">Duration</h3>
                <p className="text-gray-400 text-sm">
                  {formatTime(gameSettings?.gameDuration || 7200000)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Settings */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center mb-6">
              <Settings className="w-6 h-6 text-cyan-400 mr-3" />
              <h2 className="text-xl font-bold text-white">Game Settings</h2>
            </div>

            <div className="space-y-6">
              {/* Game Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Start Time
                </label>
                <input
                  type="datetime-local"
                  value={localStartTime}
                  onChange={handleStartTimeChange}
                  disabled={updating}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                />
              </div>

              {/* Game Duration - Hours and Minutes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={localHours}
                      onChange={handleHoursChange}
                      disabled={updating}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={localMinutes}
                      onChange={handleMinutesChange}
                      disabled={updating}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50 text-center"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total: {localHours}h {localMinutes}m ({formatTime((localHours * 3600 + localMinutes * 60) * 1000)})
                </p>
              </div>

              {/* Game Active Toggle */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Game Active</span>
                  <button
                    onClick={() => updateGameSettings({ isGameActive: !gameSettings?.isGameActive })}
                    disabled={updating}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${
                      gameSettings?.isGameActive ? 'bg-cyan-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gameSettings?.isGameActive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>
              </div>

              {/* Save/Discard Buttons */}
              {hasChanges && (
                <div className="flex space-x-3 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={handleSaveChanges}
                    disabled={updating}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDiscardChanges}
                    disabled={updating}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Discard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Game Actions */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center mb-6">
              <RefreshCw className="w-6 h-6 text-green-400 mr-3" />
              <h2 className="text-xl font-bold text-white">Game Actions</h2>
            </div>

            <div className="space-y-4">
              {/* Pause Toggle */}
              <button
                onClick={handlePauseToggle}
                disabled={updating}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  gameSettings?.isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                } ${updating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                {gameSettings?.isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume Game
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause Game
                  </>
                )}
              </button>

              {/* Download Attendance Report */}
              <button
                onClick={handleDownloadAttendanceReport}
                disabled={downloadingCSV}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingCSV ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download Attendance Report
                  </>
                )}
              </button>

              {/* Challenge Data Switcher Button */}
              <button
                onClick={() => setShowSwitcherModal(true)}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <Database className="w-5 h-5 mr-2" />
                Switch Challenge Data ({currentDataSet})
              </button>

              {/* Reset All Teams */}
              <button
                onClick={() => setShowResetModal(true)}
                className="w-full flex items-center justify-center px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Reset All Teams
              </button>

              {/* View Leaderboard */}
              <button
                onClick={() => {
                  // Set a flag to indicate we came from admin
                  sessionStorage.setItem('returnToAdmin', 'true')
                  navigate('/leaderboard')
                }}
                className="w-full flex items-center justify-center px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <Users className="w-5 h-5 mr-2" />
                View Leaderboard
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mt-8">
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Bell className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-xl font-bold text-white">Send Notification</h2>
              </div>
              <button
                onClick={handleToggleNotificationHistory}
                className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </button>
            </div>

            <div className="space-y-4">
              {/* Notification Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title..."
                  disabled={sendingNotification}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
                />
              </div>

              {/* Notification Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter notification message..."
                  rows="3"
                  disabled={sendingNotification}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 disabled:opacity-50 resize-none"
                />
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  disabled={sendingNotification}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-yellow-400 disabled:opacity-50"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendNotification}
                disabled={sendingNotification || !notificationMessage.trim()}
                className="w-full flex items-center justify-center px-6 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 hover:scale-105"
              >
                {sendingNotification ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send to All Users
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Switcher Modal */}
      {showSwitcherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-indigo-500/50 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Switch Challenge Data</h3>
              <p className="text-gray-300 text-sm">
                Current Set: <span className="font-semibold text-indigo-400">Set {currentDataSet}</span>
              </p>
            </div>

            {!showDataSwitcher ? (
              // Password Input
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter Security Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={switcherPassword}
                      onChange={(e) => setSwitcherPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                      placeholder="Enter password"
                      onKeyPress={(e) => e.key === 'Enter' && handleSwitcherPasswordSubmit()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowSwitcherModal(false)
                      setSwitcherPassword('')
                      setShowDataSwitcher(false)
                    }}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSwitcherPasswordSubmit}
                    disabled={!switcherPassword.trim()}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : (
              // Dataset Selection
              <div className="space-y-6">
                <div className="space-y-4">
                  <div 
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      currentDataSet === 'A' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="challengeSet"
                        value="A"
                        checked={currentDataSet === 'A'}
                        onChange={() => {}}
                        className="w-4 h-4 text-green-500 mr-3"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">Challenge Set A</h4>
                        <p className="text-sm text-gray-400">Original challenge set with user-specific shuffling</p>
                        <div className="flex items-center mt-2 space-x-4 text-xs">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">20 Pictures</span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">20 Riddles</span>
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Randomized</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div 
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      currentDataSet === 'B' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="challengeSet"
                        value="B"
                        checked={currentDataSet === 'B'}
                        onChange={() => {}}
                        className="w-4 h-4 text-green-500 mr-3"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">Challenge Set B</h4>
                        <p className="text-sm text-gray-400">Alternative challenge set with user-specific shuffling</p>
                        <div className="flex items-center mt-2 space-x-4 text-xs">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">20 Pictures</span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">20 Riddles</span>
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Radnomized</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
                    <div>
                      <p className="text-yellow-300 font-medium text-sm mb-1">Warning</p>
                      <p className="text-yellow-400 text-xs">
                        Switching challenge data will affect all new games. Existing games will continue with their current dataset.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowSwitcherModal(false)
                      setShowDataSwitcher(false)
                      setSwitcherPassword('')
                    }}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={() => handleDataSetSwitch('A')}
                    disabled={switchingData || currentDataSet === 'A'}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {switchingData && currentDataSet !== 'A' ? 'Switching...' : 'Set A'}
                  </button>
                  
                  <button
                    onClick={() => handleDataSetSwitch('B')}
                    disabled={switchingData || currentDataSet === 'B'}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {switchingData && currentDataSet !== 'B' ? 'Switching...' : 'Set B'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification History Modal */}
      {showNotificationHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Notification History</h3>
              <button
                onClick={() => setShowNotificationHistory(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading history...</p>
                </div>
              ) : notificationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationHistory.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border ${
                        notification.isActive
                          ? 'bg-gray-700/50 border-gray-600'
                          : 'bg-gray-800/50 border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              notification.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                              notification.type === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                              notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {notification.type}
                            </span>
                            {notification.isActive ? (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">
                                Inactive
                              </span>
                            )}
                          </div>
                          <h4 className="text-white font-semibold mb-1">
                            {notification.title || 'Admin Notification'}
                          </h4>
                          <p className="text-gray-300 text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Sent: {notification.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Read by: {notification.readBy?.length || 0} users
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          {notification.isActive && (
                            <button
                              onClick={() => handleDeactivateNotification(notification.id)}
                              className="flex items-center px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs transition-colors"
                            >
                              <EyeOff className="w-3 h-3 mr-1" />
                              Deactivate
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-red-500/50 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Reset All Teams</h3>
              <p className="text-gray-300 text-sm">
                This will permanently delete all team data and game states except admin data.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Security Password:
              </label>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter the security answer"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetPassword('')
                  setError(null)
                }}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllTeams}
                disabled={resetLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage