import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToUserNotifications, markNotificationAsRead } from '../../firebase/collections';
import { useAuth } from '../../hooks/useAuth';
import UserNotificationModal from './UserNotificationModal';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissedInSession, setDismissedInSession] = useState(new Set());

  // Subscribe to notifications for current user
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('No current user, clearing notifications');
      setNotifications([]);
      return;
    }

    // Skip notifications for admin users
    if (currentUser.email === 'vivaan.hooda@gmail.com') {
      console.log('Admin user - skipping notification subscription');
      return;
    }

    console.log('Setting up notification subscription for user:', currentUser.uid);
    
    const unsubscribe = subscribeToUserNotifications(currentUser.uid, (newNotifications) => {
      console.log('Received notifications update:', newNotifications.length, 'notifications');
      console.log('Notifications data:', newNotifications);
      setNotifications(newNotifications);
      
      // Show the first notification that hasn't been dismissed in this session
      const unshownNotification = newNotifications.find(
        notif => !dismissedInSession.has(notif.id)
      );
      
      if (unshownNotification && !showModal) {
        console.log('Showing notification:', unshownNotification);
        setCurrentNotification(unshownNotification);
        setShowModal(true);
      }
    });

    return unsubscribe;
  }, [currentUser, dismissedInSession, showModal]);

  // Handle notification dismissal
  const handleDismiss = async () => {
    if (!currentNotification || !currentUser?.uid) return;

    console.log('Dismissing notification:', currentNotification.id);

    try {
      // Mark as read in Firebase
      await markNotificationAsRead(currentNotification.id, currentUser.uid);
      
      // Add to session dismissed list
      setDismissedInSession(prev => new Set([...prev, currentNotification.id]));
      
      // Hide modal
      setShowModal(false);
      setCurrentNotification(null);
      
      // Check if there are more notifications to show
      setTimeout(() => {
        const nextNotification = notifications.find(
          notif => notif.id !== currentNotification.id && !dismissedInSession.has(notif.id)
        );
        
        if (nextNotification) {
          console.log('Showing next notification:', nextNotification);
          setCurrentNotification(nextNotification);
          setShowModal(true);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error dismissing notification:', error);
      // Still hide the modal even if there's an error
      setShowModal(false);
      setCurrentNotification(null);
    }
  };

  // Get all notifications for history (including read ones)
  const getAllNotifications = () => {
    return notifications;
  };

  const value = {
    notifications,
    currentNotification,
    showModal,
    handleDismiss,
    getAllNotifications,
    hasUnreadNotifications: notifications.length > 0
  };

  console.log('NotificationProvider render:', {
    userEmail: currentUser?.email,
    notificationCount: notifications.length,
    showModal,
    currentNotification: currentNotification?.id
  });

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Modal */}
      <UserNotificationModal
        notification={currentNotification}
        isVisible={showModal}
        onDismiss={handleDismiss}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;