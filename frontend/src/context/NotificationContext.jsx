import { createContext, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = (id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const notify = ({ title, message, type = 'info', duration = 4000 }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const nextNotification = { id, title, message, type, duration };

    setNotifications((current) => [...current, nextNotification]);

    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  };

  const value = useMemo(
    () => ({
      notifications,
      notify,
      dismiss,
      success: (title, message, duration) => notify({ title, message, type: 'success', duration }),
      error: (title, message, duration) => notify({ title, message, type: 'error', duration }),
      warning: (title, message, duration) => notify({ title, message, type: 'warning', duration }),
      info: (title, message, duration) => notify({ title, message, type: 'info', duration }),
    }),
    [notifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
}
