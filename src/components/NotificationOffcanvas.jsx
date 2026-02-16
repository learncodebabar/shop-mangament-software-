import Offcanvas from "react-bootstrap/Offcanvas";
import Badge from "react-bootstrap/Badge";
import { useNotifications } from "../context/NotificationContext.jsx";
import { useRef, useEffect, useState } from "react";

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${key}${interval !== 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

export default function NotificationsOffcanvas({ show, handleClose }) {
  const {
    notifications,
    unreadCount,
    removeNotification,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    clearAll,
    loading,
  } = useNotifications();

  const [filter, setFilter] = useState("all");
  const listRef = useRef(null);
  const observerRef = useRef(null);
  const markTimeoutsRef = useRef(new Map());

  useEffect(() => {
    if (!show || !listRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Clear all pending timeouts
    markTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    markTimeoutsRef.current.clear();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.id;
          const isRead = entry.target.dataset.read === "true";

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Notification is visible
            if (id && !isRead) {
              if (markTimeoutsRef.current.has(id)) {
                clearTimeout(markTimeoutsRef.current.get(id));
              }

              const timeout = setTimeout(() => {
                markAsRead(id);
                markTimeoutsRef.current.delete(id);
              }, 2000);

              markTimeoutsRef.current.set(id, timeout);
            }
          } else {
            if (markTimeoutsRef.current.has(id)) {
              clearTimeout(markTimeoutsRef.current.get(id));
              markTimeoutsRef.current.delete(id);
            }
          }
        });
      },
      {
        root: listRef.current,
        threshold: 0.5,
        rootMargin: "0px",
      },
    );

    const items = listRef.current.querySelectorAll(".notification-item");
    items.forEach((item) => observerRef.current.observe(item));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      markTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      markTimeoutsRef.current.clear();
    };
  }, [show, notifications, markAsRead]);

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const getIcon = (type) => {
    const icons = {
      success: "bi-check-circle-fill text-success",
      warning: "bi-exclamation-triangle-fill text-warning",
      error: "bi-x-circle-fill text-danger",
      "low-stock": "bi-box-seam-fill text-info",
      "new-credit": "bi-person-plus-fill text-primary",
      info: "bi-info-circle-fill text-info",
    };

    return <i className={`bi ${icons[type] || icons.info} fs-4`}></i>;
  };

  const getBorderClass = (type) => {
    const borders = {
      success: "border-start border-success border-3",
      warning: "border-start border-warning border-3",
      error: "border-start border-danger border-3",
      "low-stock": "border-start border-info border-3",
      "new-credit": "border-start border-primary border-3",
    };

    return borders[type] || "";
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
  };

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      className="w-100"
      style={{ maxWidth: "450px" }}
    >
      <Offcanvas.Header closeButton className="border-bottom bg-body">
        <Offcanvas.Title className="fw-bold d-flex align-items-center w-100">
          <div className="d-flex align-items-center">
            <i className="bi bi-bell-fill me-2 text-primary fs-5"></i>
            Notifications
            {unreadCount > 0 && (
              <Badge bg="danger" pill className="ms-2 pulse-badge">
                {unreadCount}
              </Badge>
            )}
          </div>
        </Offcanvas.Title>
      </Offcanvas.Header>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 p-3 bg-body border-bottom">
        <button
          className={`btn btn-sm flex-grow-1 ${
            filter === "all" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          className={`btn btn-sm flex-grow-1 ${
            filter === "unread" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`btn btn-sm flex-grow-1 ${
            filter === "read" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setFilter("read")}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      <Offcanvas.Body className="p-0 d-flex flex-column">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-5 text-muted flex-grow-1 d-flex flex-column justify-content-center">
            <i className="bi bi-bell-slash fs-1 mb-3 opacity-50"></i>
            <p className="mb-1 fw-medium">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                  ? "No read notifications"
                  : "All clear!"}
            </p>
            <small>{filter === "all" && "No notifications yet"}</small>
          </div>
        ) : (
          <>
            <div
              ref={listRef}
              className="flex-grow-1 overflow-auto"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            >
              {filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  data-id={notif._id}
                  data-read={notif.isRead}
                  className={`notification-item p-3 border-bottom position-relative ${getBorderClass(
                    notif.type,
                  )} ${
                    notif.isRead ? "bg-body" : "bg-body bg-gradient"
                  } hover-bg-body cursor-pointer`}
                  style={{
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <div
                      className="position-absolute top-0 end-0 me-3 mt-3"
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: "#0d6efd",
                        borderRadius: "50%",
                      }}
                    ></div>
                  )}

                  <div className="d-flex gap-3 align-items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-grow-1 pe-4">
                      <p
                        className={`mb-1 small ${
                          notif.isRead
                            ? "text-muted fw-normal"
                            : "text-dark fw-semibold"
                        }`}
                      >
                        {notif.message}
                      </p>
                      <small className="text-muted d-block">
                        <i className="bi bi-clock me-1"></i>
                        {timeAgo(notif.timestamp)}
                      </small>
                    </div>
                    <button
                      className="btn btn-sm p-0 text-muted opacity-50 hover-opacity-100"
                      style={{
                        transition: "opacity 0.2s",
                        minWidth: "24px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notif._id);
                      }}
                      title="Remove"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="border-top bg-body p-3">
              <div className="d-flex gap-2">
                {unreadCount > 0 && (
                  <button
                    className="btn btn-outline-primary btn-sm flex-grow-1"
                    onClick={markAllAsRead}
                  >
                    <i className="bi bi-check-all me-2"></i>
                    Mark All Read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    className="btn btn-outline-danger btn-sm flex-grow-1"
                    onClick={() => {
                      if (window.confirm("Clear all notifications?")) {
                        clearAll();
                      }
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Offcanvas.Body>

      <style>{`
        .notification-item:hover {
          background-color: #f8f9fa !important;
        }

        .hover-opacity-100:hover {
          opacity: 1 !important;
        }

        .hover-bg-light:hover {
          filter: brightness(0.98);
        }

        .pulse-badge {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </Offcanvas>
  );
}
