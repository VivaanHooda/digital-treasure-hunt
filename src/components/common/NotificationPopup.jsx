import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { subscribeToActiveNotifications, markNotificationAsRead } from '../../firebase/collections'
import { 
  Bell, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertCircle 
} from 'lucide-react'

const NotificationPopup = () => {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [visibleNotifications, setVisibleNotifications] = useState([])

  // Subscribe to active notifications
  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = subscribeToActiveNotifications(currentUser.uid, (newNotifications) => {
      setNotifications(newNotifications)
    })

    return unsubscribe
  }, [currentUser])

  // Show new notifications as popups
  useEffect(() => {
    notifications.forEach(notification => {
      // Check if this notification is already visible
      if (!visibleNotifications.find(visible => visible.id === notification.id)) {
        setVisibleNotifications(prev => [...prev, notification])
        
        // Auto-hide after 10 seconds for non-error notifications
        if (notification.type !== 'error') {
          setTimeout(() => {
            handleDismiss(notification.id)
          }, 10000)
        }
      }
    })
  }, [notifications, visibleNotifications])

  const handleDismiss = async (notificationId) => {
    // Mark as read in Firebase
    if (currentUser?.uid) {
      await markNotificationAsRead(notificationId, currentUser.uid)
    }
    
    // Remove from visible notifications
    setVisibleNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    )
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10'
      case 'warning':
        return 'border-orange-500/50 bg-orange-500/10'
      case 'error':
        return 'border-red-500/50 bg-red-500/10'
      default:
        return 'border-blue-500/50 bg-blue-500/10'
    }
  }

  if (visibleNotifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`
            backdrop-blur-xl rounded-xl border p-4 shadow-2xl
            animate-slideInRight transition-all duration-500
            ${getNotificationStyle(notification.type)}
          `}
          style={{ 
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 10}px)`
          }}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {notification.title || 'Admin Notification'}
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {notification.message}
                  </p>
                </div>
                
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {notification.createdAt?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                  </span>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  notification.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                  notification.type === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                  notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {notification.type}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default NotificationPopup