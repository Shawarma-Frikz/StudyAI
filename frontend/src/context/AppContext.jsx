import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { auth as authAPI, notifications as notificationsAPI, documents as documentsAPI, setToken, clearToken, refreshAccessToken } from "../services/api";
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "U";
  return parts.map(p => p[0].toUpperCase()).join("");
}
export function getFieldLabel(value) {
  const map = {
    "computer-science": "Computer Science", engineering: "Engineering",
    mathematics: "Mathematics", physics: "Physics", chemistry: "Chemistry",
    biology: "Biology", medicine: "Medicine", business: "Business",
    economics: "Economics", literature: "Literature", history: "History",
    psychology: "Psychology", other: "Other",
  };
  return map[value] || "Other";
}
export function getTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m > 0) return `${m} minute${m > 1 ? "s" : ""} ago`;
  return "Just now";
}
export function getCurrentMonthYear() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}
const STUDY_TIME_KEY = "studyai_study_time";
function loadStudyTime() {
  try {
    const s = localStorage.getItem(STUDY_TIME_KEY);
    if (!s) return { accumulated: 0, startTime: null };
    const p = JSON.parse(s);
    return {
      accumulated: typeof p.accumulatedStudyMilliseconds === "number" ? p.accumulatedStudyMilliseconds : 0,
      startTime: p.isStudySessionActive && typeof p.studySessionStartTime === "number" ? p.studySessionStartTime : null,
    };
  } catch { return { accumulated: 0, startTime: null }; }
}
export function AppProvider({ children }) {
  const [currentSection, setCurrentSection] = useState("hero");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState("login");
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, error: false });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notifPollRef = useRef(null);
  const [learningData, setLearningData] = useState({
    quizHistory: [], activityLog: [], studyStreak: 1, lastActivityDate: new Date().toDateString(),
  });
  const intervalRef = useRef(null);
  const { accumulated: initAcc, startTime: initStart } = loadStudyTime();
  const [accumulated, setAccumulated] = useState(initAcc);
  const [sessionStart, setSessionStart] = useState(initStart);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await refreshAccessToken();
        setToken(token);
        const me = await authAPI.me();
        if (!cancelled) setCurrentUser(me.data.user);
      } catch { clearToken(); }
      finally { if (!cancelled) setAuthLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await documentsAPI.getAll();
      setDocuments(res.data.documents);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [currentUser, fetchDocuments]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadNotifications(res.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifications(0);
      if (notifPollRef.current) { clearInterval(notifPollRef.current); notifPollRef.current = null; }
      return;
    }
    fetchUnreadCount();
    notifPollRef.current = setInterval(fetchUnreadCount, 15000);
    return () => { if (notifPollRef.current) { clearInterval(notifPollRef.current); notifPollRef.current = null; } };
  }, [currentUser, fetchUnreadCount]);

  useEffect(() => {
    const seed = () => {
      addActivityRaw("upload", "Welcome to StudyAI!", "Started your learning journey");
    };
    seed();
  }, []);
  useEffect(() => {
    if (initStart !== null && !intervalRef.current)
      intervalRef.current = setInterval(() => saveStudyTime(initAcc, initStart), 60_000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, []);
  function saveStudyTime(acc, start) {
    try { localStorage.setItem(STUDY_TIME_KEY, JSON.stringify({ accumulatedStudyMilliseconds: acc, studySessionStartTime: start, isStudySessionActive: start !== null })); }
    catch { }
  }
  const getFormattedStudyHours = useCallback(() => {
    const ms = sessionStart !== null ? accumulated + (Date.now() - sessionStart) : accumulated;
    return (ms / 3_600_000).toFixed(1);
  }, [accumulated, sessionStart]);
  const startStudySession = useCallback(() => {
    if (sessionStart !== null) return;
    const now = Date.now();
    setSessionStart(now); saveStudyTime(accumulated, now);
    if (!intervalRef.current) intervalRef.current = setInterval(() => saveStudyTime(accumulated, now), 60_000);
  }, [sessionStart, accumulated]);
  const stopStudySession = useCallback(() => {
    if (sessionStart !== null) { const a = accumulated + (Date.now() - sessionStart); setAccumulated(a); setSessionStart(null); saveStudyTime(a, null); }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, [sessionStart, accumulated]);
  const showToast = useCallback((message, error = false) => {
    setToast({ message, visible: true, error });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }, []);
  const openAuth = useCallback((form = "login") => { setAuthForm(form); setAuthOpen(true); }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const switchForm = useCallback((form) => setAuthForm(form), []);
  const handleRegister = useCallback(async (fullName, email, password, studyField) =>
    authAPI.register({ fullName, email, password, studyField }), []);
  const handleVerifyEmail = useCallback(async (email, otp) => {
    const res = await authAPI.verifyEmail({ email, otp });
    setToken(res.data.accessToken);
    setCurrentUser(res.data.user);
    startStudySession();
    setAuthOpen(false);
    return res;
  }, [startStudySession]);
  const handleLogin = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    setToken(res.data.accessToken);
    setCurrentUser(res.data.user);
    startStudySession();
    setAuthOpen(false);
    return res;
  }, [startStudySession]);
  const handleLogout = useCallback(async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    try { await authAPI.logout(); } catch { }
    clearToken(); setCurrentUser(null); stopStudySession(); setAuthOpen(false);
    showToast("Logged out successfully"); setCurrentSection("hero");
  }, [stopStudySession, showToast]);
  const handleUpdateProfile = useCallback(async (updates) => {
    const res = await authAPI.updateProfile(updates);
    setCurrentUser(res.data.user);
    return res;
  }, []);

  const addDocuments = useCallback(async (files) => {
    if (!currentUser) {
      showToast("Please log in to upload documents", true);
      return;
    }
    const fileArray = Array.from(files);
    const created = [];
    for (const file of fileArray) {
      try {
        const kb = (file.size / 1024).toFixed(0);
        const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
        const type = file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "text";
        const res = await documentsAPI.create({ name: file.name, type, size, mimeType: file.type });
        created.push(res.data.document);
      } catch {
        showToast(`Failed to upload ${file.name}`, true);
      }
    }
    if (created.length) {
      setDocuments(prev => [...created, ...prev]);
      addActivityRaw("upload", `${created.length} file(s) uploaded`, fileArray[0]?.name || "");
      showToast(`${created.length} file(s) uploaded successfully!`);
    }
  }, [currentUser, showToast]);

  const deleteDocument = useCallback(async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await documentsAPI.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id && d.id !== id));
      showToast("Document deleted!");
    } catch {
      showToast("Failed to delete document", true);
    }
  }, [showToast]);

  const renameDocument = useCallback(async (id, name) => {
    try {
      const res = await documentsAPI.rename(id, name);
      setDocuments(prev => prev.map(d => (d._id === id || d.id === id) ? res.data.document : d));
      showToast("Document renamed!");
    } catch {
      showToast("Failed to rename document", true);
    }
  }, [showToast]);

  function addActivityRaw(type, title, description) {
    setLearningData(prev => ({
      ...prev,
      activityLog: [{ type, title, description, timestamp: new Date() }, ...prev.activityLog].slice(0, 20),
    }));
  }
  const addActivity = useCallback(addActivityRaw, []);
  const trackQuizCompletion = useCallback((quizData) => {
    setLearningData(prev => {
      const today = new Date().toDateString();
      const diff = prev.lastActivityDate !== today
        ? Math.ceil(Math.abs(new Date(today) - new Date(prev.lastActivityDate)) / 86_400_000) : 0;
      const streak = diff === 1 ? prev.studyStreak + 1 : diff > 1 ? 1 : prev.studyStreak;
      return { ...prev, quizHistory: [...prev.quizHistory, { ...quizData, timestamp: new Date() }], studyStreak: streak, lastActivityDate: today };
    });
    addActivityRaw("quiz", `Completed quiz for ${quizData.documentName}`, `Score: ${quizData.score}%`);
  }, []);
  const navigateTo = useCallback((section) => {
    setCurrentSection(section); window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <AppContext.Provider value={{
      currentSection, navigateTo,
      currentUser, setCurrentUser, authLoading, authOpen, authForm,
      openAuth, closeAuth, switchForm,
      handleRegister, handleVerifyEmail, handleLogin, handleLogout, handleUpdateProfile,
      getFormattedStudyHours, startStudySession, stopStudySession,
      documents, docsLoading, addDocuments, deleteDocument, renameDocument, fetchDocuments,
      toast, showToast,
      learningData, trackQuizCompletion, addActivity,
      unreadNotifications, setUnreadNotifications, fetchUnreadCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}
