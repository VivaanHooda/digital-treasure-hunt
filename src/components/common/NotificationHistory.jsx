import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAllNotifications } from '../../firebase/collections'
import { 
  Bell, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertCircle,
  Clock,
  History
} from 'lucide-react'

const NotificationHistory = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  // Load notification history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const allNotifications = await getAllNotifications()
      
      // Filter to only show notifications that were active after user joined
      // or notifications that the user has interacted with
      const userNotifications = allNotifications.filter(notification => {
        // Show all notifications for simplicity - admin can see all, users see all too
        return true
      })
      
      setNotifications(userNotifications)
    } catch (error) {
      console.error('Error loading notification history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getNotificationBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'warning':
        return 'border-l-orange-500'
      case 'error':
        return 'border-l-red-500'
      default:
        return 'border-l-blue-500'
    }
  }

  const isNotificationRead = (notification) => {
    return notification.readBy && notification.readBy.includes(currentUser?.uid)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <History className="w-6 h-6 text-blue-400 mr-3" />
            <h2 className="text-xl font-bold text-white">Notification History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Notifications</h3>
              <p className="text-gray-400">No notifications have been sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isRead = isNotificationRead(notification)
                
                return (
                  <div
                    key={notification.id}
                    className={`
                      p-4 rounded-xl border-l-4 transition-all duration-200
                      ${getNotificationBorderColor(notification.type)}
                      ${isRead 
                        ? 'bg-gray-800/30 border-r border-t border-b border-gray-700/50' 
                        : 'bg-gray-700/50 border-r border-t border-b border-gray-600/50 ring-1 ring-blue-400/20'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className={`font-semibold ${isRead ? 'text-gray-200' : 'text-white'}`}>
                                {notification.title || 'Admin Notification'}
                              </h3>
                              {!isRead && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              )}
                            </div>
                            
                            <p className={`text-sm leading-relaxed mb-3 ${isRead ? 'text-gray-400' : 'text-gray-300'}`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-500">
                                    {notification.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                  </span>
                                  <span className="text-gray-500">
                                    {notification.createdAt?.toDate?.()?.toLocaleTimeString() || ''}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
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
                                    Expired
                                  </span>
                                )}
                                
                                {isRead && (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                    Read
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Total notifications: {notifications.length}</span>
            <span>
              Unread: {notifications.filter(n => !isNotificationRead(n)).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationHistory