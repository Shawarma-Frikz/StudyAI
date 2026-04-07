const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let _accessToken = null;

export function setToken(t) { _accessToken = t; }
export function getToken() { return _accessToken; }
export function clearToken() { _accessToken = null; }

async function req(method, path, body, skipAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (_accessToken && !skipAuth) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new APIError(data.message || "Request failed", res.status, data);
  return data;
}

export class APIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

export async function refreshAccessToken() {
  const data = await req("POST", "/auth/refresh", null, true);
  if (data.data?.accessToken) {
    _accessToken = data.data.accessToken;
    return data.data.accessToken;
  }
  throw new Error("Refresh failed");
}

export const auth = {
  register: (body) => req("POST", "/auth/register", body, true),
  verifyEmail: (body) => req("POST", "/auth/verify-email", body, true),
  resendOTP: (body) => req("POST", "/auth/resend-otp", body, true),
  login: (body) => req("POST", "/auth/login", body, true),
  logout: () => req("POST", "/auth/logout"),
  forgotPassword: (body) => req("POST", "/auth/forgot-password", body, true),
  verifyResetOTP: (body) => req("POST", "/auth/verify-reset-otp", body, true),
  resetPassword: (body) => req("POST", "/auth/reset-password", body, true),
  me: () => req("GET", "/auth/me"),
  updateProfile: (body) => req("PATCH", "/auth/update-profile", body),
  changePassword: (body) => req("PATCH", "/auth/change-password", body),
  refresh: () => req("POST", "/auth/refresh", null, true),
};

export const admin = {
  dashboard: () => req("GET", "/admin/dashboard"),
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/admin/users${qs ? "?" + qs : ""}`);
  },
  getUser: (id) => req("GET", `/admin/users/${id}`),
  updateUser: (id, body) => req("PATCH", `/admin/users/${id}`, body),
  deleteUser: (id) => req("DELETE", `/admin/users/${id}`),
  verifyUser: (id) => req("POST", `/admin/users/${id}/verify`),
  getReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/admin/reports${qs ? "?" + qs : ""}`);
  },
  sendNotice: (reportId, body) => req("POST", `/admin/reports/${reportId}/notice`, body),
  banUser: (reportId, body) => req("POST", `/admin/reports/${reportId}/ban`, body),
  dismissReport: (reportId) => req("PATCH", `/admin/reports/${reportId}/dismiss`),
};

export const studyRooms = {  create: (body) => req("POST", "/studyrooms", body),
  join: (body) => req("POST", "/studyrooms/join", body),
  invite: (roomId, body) => req("POST", `/studyrooms/${roomId}/invite`, body),
  searchUsers: (q) => req("GET", `/studyrooms/search-users?q=${encodeURIComponent(q)}`),
  myRooms: () => req("GET", "/studyrooms/my"),
  getRoom: (roomId) => req("GET", `/studyrooms/${roomId}`),
  getMessages: (roomId, since) => req("GET", `/studyrooms/${roomId}/messages${since ? `?since=${encodeURIComponent(since)}` : ""}`),
  sendMessage: (roomId, body) => req("POST", `/studyrooms/${roomId}/messages`, body),
  reportMessage: (roomId, messageId, body) => req("POST", `/studyrooms/${roomId}/messages/${messageId}/report`, body),
  kickMember: (roomId, userId) => req("DELETE", `/studyrooms/${roomId}/kick/${userId}`),
  leave: (roomId) => req("DELETE", `/studyrooms/${roomId}/leave`),
  deleteRoom: (roomId) => req("DELETE", `/studyrooms/${roomId}`),
};

export const notifications = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/notifications${qs ? "?" + qs : ""}`);
  },
  getUnreadCount: () => req("GET", "/notifications/unread-count"),
  markRead: (id) => req("PATCH", `/notifications/${id}/read`),
  markAllRead: () => req("PATCH", "/notifications/read-all"),
  delete: (id) => req("DELETE", `/notifications/${id}`),
};

export const documents = {
  getAll: (q) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return req("GET", `/documents${qs}`);
  },
  create: (body) => req("POST", "/documents", body),
  rename: (id, name) => req("PATCH", `/documents/${id}/rename`, { name }),
  delete: (id) => req("DELETE", `/documents/${id}`),
};
