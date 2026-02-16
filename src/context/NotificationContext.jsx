import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../api/api";
import { API_ENDPOINTS } from "../api/EndPoints";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get(API_ENDPOINTS.NOTIFICATION);
      const data = res.data || [];

      const normalized = data.map((n) => ({
        ...n,
        isRead: n.isRead ?? false,
        timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
      }));

      console.log(
        "Loaded notifications:",
        normalized.length,
        "Unread:",
        normalized.filter((n) => !n.isRead).length,
      );
      setNotifications(normalized);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = async (type, message) => {
    const tempNotification = {
      _id: `temp_${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    // Optimistically add to UI
    setNotifications((prev) => [tempNotification, ...prev]);

    try {
      const res = await api.post(API_ENDPOINTS.NOTIFICATION, { type, message });

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === tempNotification._id ? { ...res.data, isRead: false } : n,
        ),
      );
    } catch (err) {
      console.error("Failed to save notification:", err);
    }
  };

  const markAsRead = useCallback(async (id) => {
    if (!id) return;

    console.log("Marking as read:", id);

    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );

    try {
      const res = await api.patch(`${API_ENDPOINTS.NOTIFICATION}/${id}`, {
        isRead: true,
      });
      console.log("Mark as read response:", res.data);

      if (res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? res.data : n)),
        );
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n)),
      );
    }
  }, []);

  const markMultipleAsRead = useCallback(
    async (ids) => {
      if (!ids || ids.length === 0) return;

      const unreadIds = ids.filter((id) =>
        notifications.find((n) => n._id === id && !n.isRead),
      );

      if (unreadIds.length === 0) return;

      console.log("Marking multiple as read:", unreadIds);

      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n._id) ? { ...n, isRead: true } : n,
        ),
      );

      try {
        const res = await api.patch(`${API_ENDPOINTS.NOTIFICATION}/mark-read`, {
          ids: unreadIds,
        });
        console.log("Mark multiple response:", res.data);
      } catch (err) {
        console.error("Failed to mark multiple as read:", err);
        setNotifications((prev) =>
          prev.map((n) =>
            unreadIds.includes(n._id) ? { ...n, isRead: false } : n,
          ),
        );
      }
    },
    [notifications],
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n._id);

    if (unreadIds.length === 0) return;

    console.log("Marking all as read. Total unread:", unreadIds.length);

    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await api.patch(
        `${API_ENDPOINTS.NOTIFICATION}/mark-all-read`,
      );
      console.log("Mark all response:", res.data);

      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      await loadNotifications();
    }
  }, [notifications]);

  const removeNotification = async (id) => {
    if (!id) return;

    setNotifications((prev) => prev.filter((n) => n._id !== id));

    try {
      await api.delete(`${API_ENDPOINTS.NOTIFICATION}/${id}`);
    } catch (err) {
      console.error("Delete failed:", err);
      loadNotifications();
    }
  };

  const clearAll = async () => {
    const backup = [...notifications];

    setNotifications([]);

    try {
      await api.delete(`${API_ENDPOINTS.NOTIFICATION}/clear-all`);
    } catch (err) {
      console.error("Clear failed:", err);
      setNotifications(backup);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        removeNotification,
        markAsRead,
        markMultipleAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications: loadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
};
