import { useState, useEffect, useCallback } from "react";
import { useApp, getInitials } from "../context/AppContext";
import { admin as adminAPI } from "../services/api";

function StatCard({ icon, value, label, color = "#a78bfa" }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    green: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
    red: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
    blue: { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
    yellow: { bg: "rgba(234,179,8,0.15)", text: "#facc15" },
    orange: { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, textTransform: "uppercase", letterSpacing: 0.5
    }}>
      {children}
    </span>
  );
}

function btnStyle(color) {
  return {
    padding: "4px 12px", borderRadius: 6, border: `1px solid ${color}`,
    background: "transparent", color, cursor: "pointer", fontSize: 12, fontWeight: 600,
    transition: "all 0.15s", whiteSpace: "nowrap",
  };
}

function UsersTable({ users, onVerify, onToggleActive, loading }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
      Loading users…
    </div>
  );
  if (!users.length) return (
    <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
      No users found
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["User", "Email", "Field", "Role", "Status", "Joined", "Actions"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "10px 12px", color: "rgba(255,255,255,0.45)",
                fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap"
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id} style={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              opacity: u.isActive ? 1 : 0.45, transition: "opacity 0.2s"
            }}>
              <td style={{ padding: "12px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center", background: "linear-gradient(135deg,#667eea,#764ba2)",
                    fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0
                  }}>
                    {getInitials(u.fullName)}
                  </div>
                  <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{u.fullName}</span>
                </div>
              </td>
              <td style={{ padding: "12px 12px", color: "rgba(255,255,255,0.6)" }}>{u.email}</td>
              <td style={{ padding: "12px 12px", color: "rgba(255,255,255,0.6)" }}>{u.studyFieldLabel || "—"}</td>
              <td style={{ padding: "12px 12px" }}>
                <Badge color={u.role === "admin" ? "blue" : "yellow"}>{u.role}</Badge>
              </td>
              <td style={{ padding: "12px 12px" }}>
                {u.isBanned
                  ? <Badge color="red">Banned</Badge>
                  : u.isVerified
                    ? <Badge color="green">Verified</Badge>
                    : <Badge color="red">Unverified</Badge>}
              </td>
              <td style={{ padding: "12px 12px", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: "12px 12px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {!u.isVerified && (
                    <button onClick={() => onVerify(u._id)} style={btnStyle("#22c55e")}>Verify</button>
                  )}
                  <button onClick={() => onToggleActive(u._id, u.isActive)}
                    style={btnStyle(u.isActive ? "#ef4444" : "#a78bfa")}>
                    {u.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldChart({ data }) {
  if (!data.length) return <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 20 }}>No data yet</p>;
  const max = Math.max(...data.map(d => d.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.slice(0, 8).map(item => (
        <div key={item._id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: "#e2e8f0" }}>{item._id}</span>
            <span style={{ color: "#a78bfa", fontWeight: 600 }}>{item.count}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(item.count / max) * 100}%`,
              background: "linear-gradient(90deg,#667eea,#a78bfa)", borderRadius: 4, transition: "width 0.5s"
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoticeModal({ report, onClose, onSubmit }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await onSubmit(report._id, message.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111827", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 6 }}>📝 Send Notice</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>
          Sending warning notice to <strong style={{ color: "rgba(255,255,255,0.7)" }}>{report.reportedUser?.fullName}</strong>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Report Reason</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{report.reason}</div>
        </div>
        <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Notice Message</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your warning or notice to the user..."
          rows={4}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)",
            color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 13,
            outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnStyle("rgba(255,255,255,0.3)")}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            style={{
              background: "linear-gradient(135deg,#667eea,#a78bfa)", border: "none",
              color: "#fff", borderRadius: 8, padding: "9px 20px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, opacity: submitting || !message.trim() ? 0.5 : 1,
            }}
          >
            {submitting ? "Sending..." : "Send Notice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BanModal({ report, onClose, onSubmit }) {
  const [days, setDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const d = parseInt(days, 10);
    if (!d || d < 1) return;
    setSubmitting(true);
    await onSubmit(report._id, d);
    setSubmitting(false);
    onClose();
  };

  const presets = [1, 3, 7, 14, 30, 90];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111827", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "#f87171", marginBottom: 6 }}>🔒 Ban User</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>
          Banning <strong style={{ color: "rgba(255,255,255,0.7)" }}>{report.reportedUser?.fullName}</strong> for a set duration
        </div>
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Quick presets</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {presets.map(d => (
            <button
              key={d}
              onClick={() => setDays(String(d))}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${days === String(d) ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                background: days === String(d) ? "rgba(239,68,68,0.15)" : "transparent",
                color: days === String(d) ? "#f87171" : "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Custom days</div>
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnStyle("rgba(255,255,255,0.3)")}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !days || parseInt(days) < 1}
            style={{
              background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none",
              color: "#fff", borderRadius: 8, padding: "9px 20px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, opacity: submitting || !days || parseInt(days) < 1 ? 0.5 : 1,
            }}
          >
            {submitting ? "Banning..." : `Ban for ${days || "?"} day${days !== "1" ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ showToast }) {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [noticeReport, setNoticeReport] = useState(null);
  const [banReport, setBanReport] = useState(null);

  const fetchReports = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (status) params.status = status;
      const res = await adminAPI.getReports(params);
      setReports(res.data.reports);
      setPagination(res.data.pagination);
    } catch (e) {
      showToast(e.message || "Failed to load reports", true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { fetchReports(1, statusFilter); }, [statusFilter]);

  const handleSendNotice = async (reportId, message) => {
    try {
      await adminAPI.sendNotice(reportId, { noticeMessage: message });
      showToast("Notice sent via email");
      fetchReports(pagination.page, statusFilter);
    } catch (e) {
      showToast(e.message || "Failed to send notice", true);
    }
  };

  const handleBan = async (reportId, days) => {
    try {
      await adminAPI.banUser(reportId, { days });
      showToast(`User banned for ${days} day${days !== 1 ? "s" : ""}`);
      fetchReports(pagination.page, statusFilter);
    } catch (e) {
      showToast(e.message || "Failed to ban user", true);
    }
  };

  const handleDismiss = async (reportId) => {
    if (!window.confirm("Dismiss this report?")) return;
    try {
      await adminAPI.dismissReport(reportId);
      showToast("Report dismissed");
      fetchReports(pagination.page, statusFilter);
    } catch (e) {
      showToast(e.message || "Failed", true);
    }
  };

  const statusColors = { pending: "yellow", noticed: "blue", banned: "red", dismissed: "green" };

  return (
    <>
      {noticeReport && (
        <NoticeModal report={noticeReport} onClose={() => setNoticeReport(null)} onSubmit={handleSendNotice} />
      )}
      {banReport && (
        <BanModal report={banReport} onClose={() => setBanReport(null)} onSubmit={handleBan} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          🚩 Reports
          <span style={{ marginLeft: 10, fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>({pagination.total} total)</span>
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["", "pending", "noticed", "banned", "dismissed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${statusFilter === s ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                background: statusFilter === s ? "rgba(167,139,250,0.15)" : "transparent",
                color: statusFilter === s ? "#a78bfa" : "rgba(255,255,255,0.4)",
              }}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
          <button onClick={() => fetchReports(pagination.page, statusFilter)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.1)", color: "#a78bfa", cursor: "pointer", fontSize: 13 }}>
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.4)" }}>Loading reports…</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.35)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No reports found</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {reports.map(r => (
            <div key={r._id} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Reported User</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{r.reportedUser?.fullName}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{r.reportedUser?.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Reporter</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{r.reporter?.fullName}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{r.reporter?.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Room</div>
                    <div style={{ fontSize: 14, color: "#e2e8f0" }}>{r.room?.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{r.room?.code}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={statusColors[r.status] || "blue"}>{r.status}</Badge>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Reason</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{r.reason}</div>
              </div>

              {r.message && (
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Reported Content</div>
                  {r.message.text && (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: r.message.file?.name ? 6 : 0 }}>
                      {r.message.text.slice(0, 300)}{r.message.text.length > 300 ? "…" : ""}
                    </div>
                  )}
                  {r.message.file?.name && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>📎</span> <span>{r.message.file.name}</span>
                    </div>
                  )}
                </div>
              )}

              {r.adminNote && (
                <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Admin note: </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{r.adminNote}</span>
                </div>
              )}

              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setNoticeReport(r)} style={btnStyle("#a78bfa")}>
                    📝 Send Notice
                  </button>
                  <button onClick={() => setBanReport(r)} style={btnStyle("#ef4444")}>
                    🔒 Ban User
                  </button>
                  <button onClick={() => handleDismiss(r._id)} style={btnStyle("rgba(255,255,255,0.3)")}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchReports(p, statusFilter)} style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(167,139,250,0.3)",
              background: p === pagination.page ? "rgba(167,139,250,0.2)" : "transparent",
              color: p === pagination.page ? "#a78bfa" : "rgba(255,255,255,0.4)",
              cursor: "pointer", fontWeight: 600, fontSize: 14,
            }}>{p}</button>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const { currentUser, handleLogout, navigateTo, showToast } = useApp();
  const [dashData, setDashData] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await adminAPI.dashboard();
      setDashData(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoadingDash(false); }
  }, []);

  const fetchUsers = useCallback(async (page = 1, q = "") => {
    setLoadingUsers(true);
    try {
      const params = { page, limit: 15 };
      if (q) params.search = q;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === "users") fetchUsers(1, search); }, [tab]);

  async function handleVerify(id) {
    try { await adminAPI.verifyUser(id); fetchUsers(pagination.page, search); }
    catch (e) { setError(e.message); }
  }

  async function handleToggleActive(id, current) {
    try { await adminAPI.updateUser(id, { isActive: !current }); fetchUsers(pagination.page, search); }
    catch (e) { setError(e.message); }
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    fetchUsers(1, e.target.value);
  }

  const stats = dashData?.stats;
  const pendingReports = stats?.pendingReports || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0" }}>
      <div style={{
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#667eea,#a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}><img src="../../studyai-logo.svg" style={{ width: 32, height: 32 }} /> StudyAI</span>
          <span style={{
            padding: "3px 12px", borderRadius: 99, background: "rgba(167,139,250,0.15)",
            color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1
          }}>
            Admin
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigateTo("hero")} style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "#e2e8f0", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14
          }}>
            ← Back to App
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff"
            }}>
              {getInitials(currentUser?.fullName || "A")}
            </div>
            <span style={{ fontSize: 14 }}>{currentUser?.fullName}</span>
          </div>
          <button onClick={handleLogout} style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13
          }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px", display: "flex", gap: 0 }}>
        {[["overview", "📊 Overview"], ["users", "👥 Users"], ["reports", `🚩 Reports${pendingReports > 0 ? ` (${pendingReports})` : ""}`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "14px 20px", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 14, fontWeight: 600, color: tab === id ? "#a78bfa" : "rgba(255,255,255,0.4)",
            borderBottom: tab === id ? "2px solid #a78bfa" : "2px solid transparent",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}>{label}</button>
        ))}
      </div>

      {error && (
        <div style={{
          margin: "16px 32px", padding: "12px 20px", background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#f87171", fontSize: 14
        }}>
          ⚠️ {error}
          <button onClick={() => setError("")} style={{
            float: "right", background: "none", border: "none",
            color: "#f87171", cursor: "pointer", fontSize: 16
          }}>×</button>
        </div>
      )}

      <div style={{ padding: 32 }}>
        {tab === "overview" && (
          loadingDash ? (
            <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.35)", fontSize: 16 }}>
              Loading dashboard…
            </div>
          ) : stats ? (
            <>
              <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>📊 Platform Overview</h2>
              <div className="stats-grid" style={{ marginBottom: 32 }}>
                <StatCard icon="👥" value={stats.totalUsers} label="Total Students" color="#a78bfa" />
                <StatCard icon="✅" value={stats.verifiedUsers} label="Verified Students" color="#4ade80" />
                <StatCard icon="⏳" value={stats.unverifiedUsers} label="Pending Verification" color="#facc15" />
                <StatCard icon="🚩" value={stats.pendingReports} label="Pending Reports" color="#f87171" />
              </div>
              <div className="dashboard-row">
                <div className="dashboard-card">
                  <h3>🆕 Recent Signups</h3>
                  {dashData.recentUsers.length === 0
                    ? <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 20 }}>No signups yet</p>
                    : dashData.recentUsers.map(u => (
                      <div key={u._id} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                            background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff"
                          }}>
                            {getInitials(u.fullName)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.fullName}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.email}</div>
                          </div>
                        </div>
                        <Badge color={u.isVerified ? "green" : "red"}>{u.isVerified ? "Verified" : "Pending"}</Badge>
                      </div>
                    ))
                  }
                </div>
                <div className="dashboard-card">
                  <h3>🎓 Study Fields</h3>
                  <FieldChart data={dashData.fieldDistribution} />
                </div>
              </div>
              <div className="dashboard-card" style={{ marginTop: 24 }}>
                <h3>📅 Signups (Last 7 Days)</h3>
                {dashData.dailySignups.length === 0
                  ? <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 20 }}>No signups this week</p>
                  : (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120, padding: "20px 0" }}>
                      {(() => {
                        const max = Math.max(...dashData.dailySignups.map(d => d.count), 1);
                        return dashData.dailySignups.map(d => (
                          <div key={d._id} style={{
                            flex: 1, display: "flex", flexDirection: "column",
                            alignItems: "center", gap: 6, minWidth: 0
                          }}>
                            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>{d.count}</span>
                            <div style={{
                              width: "100%", background: "linear-gradient(180deg,#667eea,#764ba2)",
                              height: `${(d.count / max) * 80}px`, borderRadius: "4px 4px 0 0", minHeight: 4,
                              transition: "height 0.4s ease"
                            }} />
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center" }}>
                              {d._id.slice(5)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  )
                }
              </div>
            </>
          ) : null
        )}

        {tab === "users" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                👥 Users
                <span style={{ marginLeft: 10, fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>({pagination.total} total)</span>
              </h2>
              <button onClick={() => fetchUsers(pagination.page, search)} style={{
                background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)",
                color: "#a78bfa", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13
              }}>
                🔄 Refresh
              </button>
            </div>
            <div className="search-bar" style={{ marginBottom: 20 }}>
              <input type="text" placeholder="Search by name or email…" value={search} onChange={handleSearch} />
              <span className="search-icon">🔍</span>
            </div>
            <div className="dashboard-card" style={{ padding: 0, overflow: "hidden" }}>
              <UsersTable users={users} onVerify={handleVerify} onToggleActive={handleToggleActive} loading={loadingUsers} />
            </div>
            {pagination.pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchUsers(p, search)} style={{
                    width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(167,139,250,0.3)",
                    background: p === pagination.page ? "rgba(167,139,250,0.2)" : "transparent",
                    color: p === pagination.page ? "#a78bfa" : "rgba(255,255,255,0.4)",
                    cursor: "pointer", fontWeight: 600, fontSize: 14,
                  }}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "reports" && (
          <ReportsTab showToast={showToast || ((msg, isErr) => { if (isErr) setError(msg); })} />
        )}
      </div>
    </div>
  );
}
