import { useState, useEffect, useRef, useCallback } from "react";
import { useApp, getInitials } from "../context/AppContext";
import { studyRooms as roomsAPI } from "../services/api";

function getFileIcon(type) {
  if (!type) return "📄";
  if (type.includes("image")) return "🖼️";
  if (type.includes("pdf")) return "📕";
  if (type.includes("text")) return "📝";
  if (type.includes("video")) return "🎬";
  if (type.includes("audio")) return "🎵";
  return "📎";
}

function formatBytes(base64) {
  if (!base64) return "";
  const bytes = Math.round((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ name, size = 32 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#4da6ff,#a855f7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function RoomCard({ room, currentUser, onClick }) {
  const isCreator = room.creator._id === currentUser?._id;
  const memberCount = room.members.length + 1;
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(20,20,35,0.7)",
        border: "1px solid rgba(77,166,255,0.15)",
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.25s",
        backdropFilter: "blur(10px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(77,166,255,0.5)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(77,166,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(77,166,255,0.15)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{room.name}</div>
        {isCreator && (
          <span style={{ fontSize: 10, background: "rgba(168,85,247,0.2)", color: "#a855f7", padding: "2px 8px", borderRadius: 20, fontWeight: 600, border: "1px solid rgba(168,85,247,0.3)" }}>
            Owner
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, color: "#4da6ff", background: "rgba(77,166,255,0.08)", padding: "3px 10px", borderRadius: 6, letterSpacing: 2, border: "1px solid rgba(77,166,255,0.2)" }}>
          {room.code}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex" }}>
          {[room.creator, ...room.members.slice(0, 3).map((m) => m.user)].map((u, i) => (
            <div key={u._id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}>
              <Avatar name={u.fullName} size={24} />
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function MentionDropdown({ users, onSelect }) {
  if (!users.length) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        background: "rgba(15,15,25,0.98)",
        border: "1px solid rgba(77,166,255,0.3)",
        borderRadius: 10,
        marginBottom: 6,
        overflow: "hidden",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        zIndex: 100,
      }}
    >
      {users.map((u) => (
        <div
          key={u._id}
          onClick={() => onSelect(u)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(77,166,255,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Avatar name={u.fullName} size={28} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{u.fullName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.email}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportModal({ msg, roomId, onClose, showToast }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await roomsAPI.reportMessage(roomId, msg._id, { reason: reason.trim() });
      showToast("Report submitted. Admins will review it.");
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to submit report", true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#111827", border: "1px solid rgba(77,166,255,0.25)",
          borderRadius: 16, padding: 28, maxWidth: 440, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 6 }}>🚩 Report Message</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
          Reporting message from <strong style={{ color: "rgba(255,255,255,0.7)" }}>{msg.sender?.fullName}</strong>
        </div>
        {msg.text && (
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,0.6)",
            marginBottom: 18, maxHeight: 80, overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {msg.text.slice(0, 200)}{msg.text.length > 200 ? "…" : ""}
          </div>
        )}
        {msg.file && (
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,0.6)",
            marginBottom: 18, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{getFileIcon(msg.file.type)}</span>
            <span>{msg.file.name}</span>
          </div>
        )}
        <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
          Reason for report
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why this message or file is inappropriate..."
          rows={3}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(77,166,255,0.2)", color: "#fff",
            borderRadius: 8, padding: "10px 14px", fontSize: 13,
            outline: "none", resize: "vertical", fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "9px 18px",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            style={{
              background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none",
              color: "#fff", borderRadius: 8, padding: "9px 18px",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              opacity: submitting || !reason.trim() ? 0.5 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isOwn, isCreator, currentUserId, roomId, showToast, onReport }) {
  const [showActions, setShowActions] = useState(false);
  const hasFile = msg.file?.data;
  const canReport = !isOwn;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexDirection: isOwn ? "row-reverse" : "row",
        marginBottom: 16,
        alignItems: "flex-end",
        position: "relative",
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && <Avatar name={msg.sender?.fullName || "?"} size={30} />}
      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", gap: 4 }}>
        {!isOwn && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", paddingLeft: 4 }}>
            {msg.sender?.fullName}
          </span>
        )}
        <div
          style={{
            background: isOwn
              ? "linear-gradient(135deg,#4da6ff,#a855f7)"
              : "rgba(30,30,50,0.9)",
            border: isOwn ? "none" : "1px solid rgba(77,166,255,0.15)",
            borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            padding: "10px 14px",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {msg.text && (
            <div
              dangerouslySetInnerHTML={{
                __html: msg.text.replace(
                  /@(\w[\w\s.-]*)/g,
                  '<span style="color:#a8d8ff;font-weight:600">@$1</span>'
                ),
              }}
            />
          )}
          {hasFile && (
            <div
              style={{
                marginTop: msg.text ? 10 : 0,
                background: "rgba(0,0,0,0.2)",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {msg.file.type?.includes("image") ? (
                <img
                  src={msg.file.data}
                  alt={msg.file.name}
                  style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, display: "block" }}
                />
              ) : (
                <>
                  <span style={{ fontSize: 22 }}>{getFileIcon(msg.file.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.file.name}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{msg.file.size || formatBytes(msg.file.data)}</div>
                  </div>
                  <a
                    href={msg.file.data}
                    download={msg.file.name}
                    style={{ color: "#a8d8ff", fontSize: 18, textDecoration: "none" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⬇️
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", paddingRight: isOwn ? 4 : 0, paddingLeft: isOwn ? 0 : 4 }}>
          {formatTime(msg.createdAt)}
        </span>
      </div>
      {canReport && showActions && (
        <button
          onClick={() => onReport(msg)}
          title="Report message"
          style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", borderRadius: 6, padding: "4px 8px", cursor: "pointer",
            fontSize: 11, fontWeight: 600, alignSelf: "center", whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          🚩
        </button>
      )}
    </div>
  );
}

function RoomChat({ room: initialRoom, currentUser, onBack, showToast }) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteUserSearch, setInviteUserSearch] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [loadingInviteSearch, setLoadingInviteSearch] = useState(false);
  const [sendEmailInvite, setSendEmailInvite] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const [reportingMsg, setReportingMsg] = useState(null);
  const [kickingUserId, setKickingUserId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const isCreator = room.creator._id === currentUser?._id;
  const allMembers = [room.creator, ...room.members.map((m) => m.user)];

  const loadMessages = useCallback(async (since = null) => {
    try {
      const res = await roomsAPI.getMessages(room._id, since);
      const msgs = res.data.messages;
      if (msgs.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m._id));
          const newMsgs = msgs.filter((m) => !ids.has(m._id));
          return since ? [...prev, ...newMsgs] : msgs;
        });
        setLastMessageTime(msgs[msgs.length - 1].createdAt);
      }
    } catch {}
  }, [room._id]);

  const refreshRoom = useCallback(async () => {
    try {
      const res = await roomsAPI.getRoom(room._id);
      setRoom(res.data.room);
    } catch {}
  }, [room._id]);

  useEffect(() => {
    loadMessages(null);
    pollRef.current = setInterval(() => {
      setLastMessageTime((prev) => {
        loadMessages(prev);
        return prev;
      });
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInputText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx !== -1 && !before.slice(atIdx + 1).includes(" ")) {
      const q = before.slice(atIdx + 1);
      setMentionStart(atIdx);
      setMentionSearch(q);
      if (q.length >= 1) {
        try {
          const res = await roomsAPI.searchUsers(q);
          const roomMemberIds = new Set(allMembers.map((m) => m._id));
          setMentionUsers(res.data.users.filter((u) => roomMemberIds.has(u._id)));
        } catch {
          setMentionUsers([]);
        }
      } else {
        setMentionUsers(allMembers.filter((m) => m._id !== currentUser?._id).slice(0, 6));
      }
    } else {
      setMentionStart(-1);
      setMentionUsers([]);
    }
  };

  const insertMention = (user) => {
    const before = inputText.slice(0, mentionStart);
    const after = inputText.slice(mentionStart + 1 + mentionSearch.length);
    setInputText(`${before}@${user.fullName}${after}`);
    setMentionUsers([]);
    setMentionStart(-1);
    textareaRef.current?.focus();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (max 5MB)", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({ name: file.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB`, data: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (sending || (!inputText.trim() && !filePreview)) return;
    setSending(true);
    try {
      await roomsAPI.sendMessage(room._id, {
        text: inputText.trim(),
        file: filePreview || undefined,
      });
      setInputText("");
      setFilePreview(null);
      setMentionUsers([]);
      await loadMessages(lastMessageTime);
    } catch (err) {
      showToast(err.message || "Failed to send", true);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInviteSearch = async (q) => {
    setInviteUserSearch(q);
    if (q.length < 2) { setInviteSearchResults([]); return; }
    setLoadingInviteSearch(true);
    try {
      const res = await roomsAPI.searchUsers(q);
      setInviteSearchResults(res.data.users);
    } catch {
      setInviteSearchResults([]);
    } finally {
      setLoadingInviteSearch(false);
    }
  };

  const handleInviteUser = async (email) => {
    if (!email) return;
    setInviting(true);
    try {
      await roomsAPI.invite(room._id, { email, sendEmail: sendEmailInvite });
      showToast(sendEmailInvite ? "Invitation email sent!" : "User invited successfully!");
      setInviteEmail("");
      setInviteUserSearch("");
      setInviteSearchResults([]);
      await refreshRoom();
    } catch (err) {
      showToast(err.message || "Failed to invite", true);
    } finally {
      setInviting(false);
    }
  };

  const handleKick = async (userId, userName) => {
    if (!window.confirm(`Kick ${userName} from this room?`)) return;
    setKickingUserId(userId);
    try {
      await roomsAPI.kickMember(room._id, userId);
      showToast(`${userName} has been removed from the room`);
      await refreshRoom();
    } catch (err) {
      showToast(err.message || "Failed to kick member", true);
    } finally {
      setKickingUserId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
      {reportingMsg && (
        <ReportModal
          msg={reportingMsg}
          roomId={room._id}
          onClose={() => setReportingMsg(null)}
          showToast={showToast}
        />
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottom: "1px solid rgba(77,166,255,0.15)",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)", color: "#4da6ff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#fff" }}>{room.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            onClick={copyCode}
            title="Copy room code"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "monospace", fontSize: 14, color: "#4da6ff",
              background: "rgba(77,166,255,0.08)", padding: "6px 12px",
              borderRadius: 8, border: "1px solid rgba(77,166,255,0.25)",
              cursor: "pointer", letterSpacing: 2, fontWeight: 700,
              transition: "all 0.2s",
            }}
          >
            {room.code}
            <span style={{ fontSize: 12, marginLeft: 2 }}>{copiedCode ? "✓" : "📋"}</span>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            style={{ background: showMembers ? "rgba(77,166,255,0.2)" : "rgba(77,166,255,0.08)", border: "1px solid rgba(77,166,255,0.25)", color: "#4da6ff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            👥 Members
          </button>
          {isCreator && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              style={{ background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              + Invite
            </button>
          )}
        </div>
      </div>

      {showMembers && (
        <div style={{
          background: "rgba(15,15,25,0.95)", border: "1px solid rgba(77,166,255,0.2)",
          borderRadius: 12, padding: 16, marginTop: 12,
          display: "flex", flexWrap: "wrap", gap: 10,
        }}>
          {allMembers.map((m) => (
            <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(77,166,255,0.06)", borderRadius: 8, padding: "8px 12px" }}>
              <Avatar name={m.fullName} size={26} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{m.fullName}</div>
                {m._id === room.creator._id
                  ? <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 600 }}>Owner</div>
                  : null
                }
              </div>
              {isCreator && m._id !== room.creator._id && (
                <button
                  onClick={() => handleKick(m._id, m.fullName)}
                  disabled={kickingUserId === m._id}
                  title="Kick member"
                  style={{
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                    color: "#f87171", borderRadius: 6, padding: "3px 8px",
                    cursor: "pointer", fontSize: 11, fontWeight: 600, marginLeft: 4,
                    opacity: kickingUserId === m._id ? 0.5 : 1,
                  }}
                >
                  {kickingUserId === m._id ? "…" : "Kick"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && isCreator && (
        <div style={{
          background: "rgba(15,15,25,0.95)", border: "1px solid rgba(77,166,255,0.2)",
          borderRadius: 12, padding: 16, marginTop: 12,
        }}>
          <div style={{ fontWeight: 600, color: "#fff", marginBottom: 10, fontSize: 14 }}>Invite a student</div>
          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <div style={{ position: "relative" }}>
              <input
                value={inviteUserSearch}
                onChange={(e) => handleInviteSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(77,166,255,0.2)",
                  color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {inviteSearchResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: "rgba(15,15,25,0.99)", border: "1px solid rgba(77,166,255,0.25)",
                  borderRadius: 10, marginTop: 4, overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  {inviteSearchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => { setInviteEmail(u.email); setInviteUserSearch(u.fullName); setInviteSearchResults([]); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(77,166,255,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Avatar name={u.fullName} size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{u.fullName}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Or type email directly..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(77,166,255,0.2)",
                  color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={() => handleInviteUser(inviteEmail)}
                disabled={inviting || !inviteEmail}
                style={{
                  background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none",
                  color: "#fff", borderRadius: 8, padding: "9px 18px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, opacity: inviting || !inviteEmail ? 0.5 : 1,
                }}
              >
                {inviting ? "Sending..." : "Invite"}
              </button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <input
                type="checkbox"
                checked={sendEmailInvite}
                onChange={(e) => setSendEmailInvite(e.target.checked)}
                style={{ accentColor: "#4da6ff", width: 15, height: 15 }}
              />
              <span>Also send an invitation email with the room code</span>
            </label>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Or share the room code <span style={{ color: "#4da6ff", fontFamily: "monospace", letterSpacing: 1 }}>{room.code}</span> directly.
              {sendEmailInvite && <span style={{ color: "#a855f7", marginLeft: 8 }}>📧 Email invite will be sent.</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", scrollbarWidth: "thin", scrollbarColor: "rgba(77,166,255,0.2) transparent" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", gap: 12 }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No messages yet</div>
            <div style={{ fontSize: 13 }}>Be the first to send a message!</div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isOwn={msg.sender?._id === currentUser?._id}
            isCreator={isCreator}
            currentUserId={currentUser?._id}
            roomId={room._id}
            showToast={showToast}
            onReport={setReportingMsg}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {filePreview && (
        <div style={{
          background: "rgba(20,20,35,0.95)", border: "1px solid rgba(77,166,255,0.2)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>{getFileIcon(filePreview.type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filePreview.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{filePreview.size}</div>
          </div>
          <button onClick={() => setFilePreview(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ position: "relative", paddingBottom: 16 }}>
        {mentionUsers.length > 0 && mentionStart !== -1 && (
          <MentionDropdown users={mentionUsers} onSelect={insertMention} />
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(20,20,35,0.8)", border: "1px solid rgba(77,166,255,0.2)", borderRadius: 14, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            style={{ background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)", color: "#4da6ff", borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0 }}
          >
            📎
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/*,.pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" />
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message... Use @ to mention a student"
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", color: "#fff",
              fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5,
              maxHeight: 120, overflowY: "auto", fontFamily: "inherit",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || (!inputText.trim() && !filePreview)}
            style={{
              background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none",
              color: "#fff", borderRadius: 10, padding: "9px 16px", cursor: "pointer",
              fontSize: 16, fontWeight: 700, flexShrink: 0,
              opacity: sending || (!inputText.trim() && !filePreview) ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {sending ? "⏳" : "➤"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, textAlign: "center" }}>
          Press Enter to send · Shift+Enter for new line · @ to mention · Hover messages to report
        </div>
      </div>
    </div>
  );
}

export default function StudyRoomsSection() {
  const { currentUser, openAuth, showToast } = useApp();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await roomsAPI.myRooms();
      setRooms(res.data.rooms);
    } catch {
      showToast("Failed to load rooms", true);
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setSubmitting(true);
    try {
      const res = await roomsAPI.create({ name: createName.trim() });
      showToast("Study room created!");
      setCreateName("");
      setShowCreate(false);
      await fetchRooms();
      setActiveRoom(res.data.room);
    } catch (err) {
      showToast(err.message || "Failed to create room", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setSubmitting(true);
    try {
      const res = await roomsAPI.join({ code: joinCode.trim() });
      showToast("Joined room!");
      setJoinCode("");
      setShowJoin(false);
      await fetchRooms();
      setActiveRoom(res.data.room);
    } catch (err) {
      showToast(err.message || "Room not found", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveOrDelete = async (room) => {
    const isCreator = room.creator._id === currentUser?._id;
    const confirm = window.confirm(isCreator ? "Delete this room?" : "Leave this room?");
    if (!confirm) return;
    try {
      if (isCreator) {
        await roomsAPI.deleteRoom(room._id);
        showToast("Room deleted");
      } else {
        await roomsAPI.leave(room._id);
        showToast("Left room");
      }
      setActiveRoom(null);
      await fetchRooms();
    } catch (err) {
      showToast(err.message || "Failed", true);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🎓</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg,#4da6ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
          Study Together
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 400, lineHeight: 1.7, marginBottom: 28 }}>
          Create or join study rooms, collaborate with classmates, share files, and learn together in real time.
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

  if (activeRoom) {
    return (
      <RoomChat
        room={activeRoom}
        currentUser={currentUser}
        onBack={() => { setActiveRoom(null); fetchRooms(); }}
        showToast={showToast}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg,#4da6ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
            Study Rooms
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Collaborate with classmates in real time</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
            style={{ background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.3)", color: "#4da6ff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Enter Code
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            style={{ background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
          >
            + Create Room
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: "rgba(20,20,35,0.8)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 14, padding: 24, marginBottom: 28, backdropFilter: "blur(10px)" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 14 }}>Create a Study Room</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Room name (e.g. Math Study Group)"
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(77,166,255,0.2)",
                color: "#fff", borderRadius: 10, padding: "11px 16px", fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={submitting || !createName.trim()}
              style={{
                background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none",
                color: "#fff", borderRadius: 10, padding: "11px 24px", cursor: "pointer",
                fontSize: 14, fontWeight: 700, opacity: submitting || !createName.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {showJoin && (
        <div style={{ background: "rgba(20,20,35,0.8)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 14, padding: 24, marginBottom: 28, backdropFilter: "blur(10px)" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 14 }}>Join with Room Code</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter 6-character code (e.g. A1B2C3)"
              maxLength={6}
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(77,166,255,0.2)",
                color: "#4da6ff", borderRadius: 10, padding: "11px 16px", fontSize: 16,
                fontFamily: "monospace", letterSpacing: 4, fontWeight: 700, outline: "none",
              }}
            />
            <button
              onClick={handleJoin}
              disabled={submitting || joinCode.length < 6}
              style={{
                background: "linear-gradient(135deg,#4da6ff,#a855f7)", border: "none",
                color: "#fff", borderRadius: 10, padding: "11px 24px", cursor: "pointer",
                fontSize: 14, fontWeight: 700, opacity: submitting || joinCode.length < 6 ? 0.5 : 1,
              }}
            >
              {submitting ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(77,166,255,0.2)", borderTop: "3px solid #4da6ff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          Loading rooms...
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.35)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No rooms yet</div>
          <div style={{ fontSize: 14 }}>Create a room or enter a code to join one</div>
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {rooms.map((room) => (
            <div key={room._id} style={{ position: "relative" }}>
              <RoomCard room={room} currentUser={currentUser} onClick={() => setActiveRoom(room)} />
              <button
                onClick={(e) => { e.stopPropagation(); handleLeaveOrDelete(room); }}
                title={room.creator._id === currentUser?._id ? "Delete room" : "Leave room"}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)",
                  color: "rgba(255,100,100,0.7)", borderRadius: 6, padding: "3px 8px",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                }}
              >
                {room.creator._id === currentUser?._id ? "🗑" : "Exit"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
