import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { notifications as notificationsAPI } from "../services/api";

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function NotifIcon({ type }) {
  if (type === "admin_notice") {
    return (
      <div style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>⚠️</div>
    );
  }
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
      background: "rgba(77,166,255,0.15)", border: "1px solid rgba(77,166,255,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
    }}>💬</div>
  );
}

function NotifCard({ notif, onMarkRead, onDelete, onRoomClick }) {
  const isUnread = !notif.read;
  const isRoomMsg = notif.type === "room_message";
  const isNotice = notif.type === "admin_notice";

  const accentColor = isNotice ? "#f87171" : "#4da6ff";
  const bgColor = isUnread
    ? isNotice ? "rgba(239,68,68,0.06)" : "rgba(77,166,255,0.06)"
    : "rgba(255,255,255,0.02)";

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${isUnread ? (isNotice ? "rgba(239,68,68,0.2)" : "rgba(77,166,255,0.2)") : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      {isUnread && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          width: 8, height: 8, borderRadius: "50%",
          background: accentColor, flexShrink: 0,
        }} />
      )}

      <NotifIcon type={notif.type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: isUnread ? 700 : 500, fontSize: 14, color: "#fff", lineHeight: 1.4 }}>
            {notif.title}
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", marginTop: 2 }}>
            {formatTime(notif.createdAt)}
          </span>
        </div>

        {notif.body && (
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10,
            background: isNotice ? "rgba(239,68,68,0.06)" : "transparent",
            borderLeft: isNotice ? "3px solid rgba(239,68,68,0.4)" : "none",
            padding: isNotice ? "8px 12px" : 0,
            borderRadius: isNotice ? "0 6px 6px 0" : 0,
          }}>
            {notif.body}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isRoomMsg && notif.meta?.roomId && (
            <button
              onClick={() => onRoomClick(notif.meta)}
              style={{
                background: "rgba(77,166,255,0.12)", border: "1px solid rgba(77,166,255,0.25)",
                color: "#4da6ff", borderRadius: 6, padding: "4px 12px",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              → Open Room
            </button>
          )}
          {isUnread && (
            <button
              onClick={() => onMarkRead(notif._id)}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "4px 12px",
                cursor: "pointer", fontSize: 12,
              }}
            >
              Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(notif._id)}
            style={{
              background: "transparent", border: "1px solid rgba(255,80,80,0.2)",
              color: "rgba(255,100,100,0.5)", borderRadius: 6, padding: "4px 12px",
              cursor: "pointer", fontSize: 12,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsSection() {
  const { currentUser, openAuth, navigateTo, showToast, setUnreadNotifications, fetchUnreadCount } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll({ page, limit: 20 });
      setNotifications(res.data.notifications);
      setPagination(res.data.pagination);
      setUnreadNotifications(res.data.unreadCount);
    } catch (e) {
      showToast(e.message || "Failed to load notifications", true);
    } finally {
      setLoading(false);
    }
  }, [showToast, setUnreadNotifications]);

  useEffect(() => {
    if (currentUser) fetchNotifications(1);
  }, [currentUser, fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      fetchUnreadCount();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifications(0);
      showToast("All notifications marked as read");
    } catch (e) {
      showToast(e.message || "Failed", true);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      fetchUnreadCount();
    } catch {}
  };

  const handleRoomClick = (meta) => {
    navigateTo("rooms");
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🔔</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg,#4da6ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
          Notifications
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 360, lineHeight: 1.7, marginBottom: 28 }}>
          Log in to see your notifications from admins and study room activity.
        </p>
        <button
          onClick={() => openAuth("login")}
          style={{ background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none", color: "#fff", borderRadius: 12, padding: "14px 32px", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
        >
          Login to get started
        </button>
      </div>
    );
  }

  const filtered = filter === "all"
    ? notifications
    : filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg,#4da6ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
            🔔 Notifications
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.25)",
                color: "#4da6ff", borderRadius: 8, padding: "8px 16px",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              ✓ Mark all read
            </button>
          )}
          <button
            onClick={() => fetchNotifications(1)}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "8px 14px",
              cursor: "pointer", fontSize: 13,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["all", "All"],
          ["unread", `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`],
          ["admin_notice", "⚠️ Admin Notices"],
          ["room_message", "💬 Room Messages"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
              border: `1px solid ${filter === val ? "#4da6ff" : "rgba(255,255,255,0.1)"}`,
              background: filter === val ? "rgba(77,166,255,0.15)" : "transparent",
              color: filter === val ? "#4da6ff" : "rgba(255,255,255,0.45)",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.3)" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(77,166,255,0.2)", borderTop: "3px solid #4da6ff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 20px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔕</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No notifications here</div>
          <div style={{ fontSize: 13 }}>
            {filter === "unread" ? "You have no unread notifications." : "Nothing in this category yet."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(n => (
            <NotifCard
              key={n._id}
              notif={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onRoomClick={handleRoomClick}
            />
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchNotifications(p)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: `1px solid ${p === pagination.page ? "rgba(77,166,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                background: p === pagination.page ? "rgba(77,166,255,0.15)" : "transparent",
                color: p === pagination.page ? "#4da6ff" : "rgba(255,255,255,0.4)",
                cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
