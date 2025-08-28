import React from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertCircle,
  X
} from 'lucide-react';

const UserNotificationModal = ({ notification, isVisible, onDismiss }) => {
  if (!isVisible || !notification) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-orange-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-400" />;
      default:
        return <Info className="w-8 h-8 text-blue-400" />;
    }
  };

  const getNotificationColors = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'from-green-500/20 to-emerald-500/20',
          border: 'border-green-500/50',
          button: 'from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800'
        };
      case 'warning':
        return {
          bg: 'from-orange-500/20 to-yellow-500/20',
          border: 'border-orange-500/50',
          button: 'from-orange-600 to-yellow-700 hover:from-orange-700 hover:to-yellow-800'
        };
      case 'error':
        return {
          bg: 'from-red-500/20 to-pink-500/20',
          border: 'border-red-500/50',
          button: 'from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800'
        };
      default:
        return {
          bg: 'from-blue-500/20 to-cyan-500/20',
          border: 'border-blue-500/50',
          button: 'from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800'
        };
    }
  };

  const colors = getNotificationColors(notification.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      {/* Animated background effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div 
        className={`
          relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl 
          rounded-2xl border ${colors.border} p-6 sm:p-8 w-full max-w-sm sm:max-w-md 
          shadow-2xl transform animate-scaleIn
        `}
      >
        {/* Close button - top right */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${colors.bg} rounded-full flex items-center justify-center shadow-lg`}>
            {getNotificationIcon(notification.type)}
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {notification.title || 'Admin Notification'}
          </h2>
        </div>

        {/* Message */}
        <div className="mb-8">
          <p className="text-lg text-gray-300 leading-relaxed text-center">
            {notification.message}
          </p>
        </div>

        {/* Timestamp */}
        <div className="mb-6 text-center">
          <p className="text-sm text-gray-400">
            {notification.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
          </p>
        </div>

        {/* OK Button */}
        <button
          onClick={onDismiss}
          className={`
            w-full py-4 px-6 bg-gradient-to-r ${colors.button}
            text-white font-bold rounded-xl transition-all duration-300 
            transform hover:scale-105 shadow-lg min-h-[48px]
            relative overflow-hidden group
          `}
        >
          <span className="relative z-10">OK</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>
    </div>
  );
};

export default UserNotificationModal;