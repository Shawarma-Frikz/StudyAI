import { useApp, getInitials } from "../context/AppContext";

export default function Navbar() {
  const { navigateTo, openAuth, currentUser, handleLogout, unreadNotifications, currentSection } = useApp();

  return (
    <nav>
      <div className="logo">
        <img src="studyai-logo.svg" alt="StudyAI logo" className="logo-mark" />
        <span className="logo-text">StudyAI</span>
      </div>
      <ul>
        <li onClick={() => navigateTo("hero")}>Home</li>
        <li onClick={() => navigateTo("dashboard")}>Dashboard</li>
        <li onClick={() => navigateTo("docs")}>My Documents</li>
        <li onClick={() => navigateTo("chat")}>AI Chat</li>
        <li onClick={() => navigateTo("rooms")}>Study Rooms</li>

        {currentUser ? (
          <>
            <li
              onClick={() => navigateTo("notifications")}
              title="Notifications"
              style={{ position: "relative", cursor: "pointer" }}
            >
              <div style={{
                position: "relative",
                width: 34, height: 34,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: currentSection === "notifications" ? "rgba(77,166,255,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${currentSection === "notifications" ? "rgba(77,166,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "50%",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(77,166,255,0.15)";
                e.currentTarget.style.borderColor = "rgba(77,166,255,0.4)";
              }}
              onMouseLeave={e => {
                if (currentSection !== "notifications") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }
              }}
              >
                <span style={{ fontSize: 16 }}>🔔</span>
                {unreadNotifications > 0 && (
                  <div style={{
                    position: "absolute",
                    top: -4, right: -4,
                    minWidth: 18, height: 18,
                    borderRadius: 99,
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    border: "2px solid #0a0e1a",
                    lineHeight: 1,
                  }}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </div>
                )}
              </div>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default" }}>
              <div
                onClick={() => openAuth("profile")}
                title="View profile"
                style={{
                  width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
                  background: "linear-gradient(135deg,#667eea,#764ba2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#fff",
                  border: "2px solid rgba(255,255,255,0.15)",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {getInitials(currentUser.fullName)}
              </div>
            </li>
          </>
        ) : (
          <li className="auth-btn" onClick={() => openAuth("login")}>Login / Sign Up</li>
        )}
      </ul>
    </nav>
  );
}
