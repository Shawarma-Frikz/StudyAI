import { useState, useRef, useEffect } from "react";
import { useApp, getInitials } from "../context/AppContext";
import { auth as authAPI } from "../services/api";
const STUDY_FIELDS = [
  ["computer-science", "Computer Science"], ["engineering", "Engineering"],
  ["mathematics", "Mathematics"], ["physics", "Physics"], ["chemistry", "Chemistry"],
  ["biology", "Biology"], ["medicine", "Medicine"], ["business", "Business"],
  ["economics", "Economics"], ["literature", "Literature"], ["history", "History"],
  ["psychology", "Psychology"], ["other", "Other"],
];
function Spinner() {
  return <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginLeft: 8 }} />;
}
function OTPInput({ value, onChange }) {
  const inputsRef = useRef([]);
  const digits = (value + "      ").slice(0, 6).split("");
  function handleKey(e, i) {
    if (e.key === "Backspace") {
      const next = [...digits]; next[i] = "";
      onChange(next.join("").trim());
      if (i > 0) inputsRef.current[i - 1]?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = [...digits]; next[i] = e.key;
      onChange(next.join("").trimEnd());
      if (i < 5) inputsRef.current[i + 1]?.focus();
    }
    e.preventDefault();
  }
  function handlePaste(e) {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(paste);
    inputsRef.current[Math.min(paste.length, 5)]?.focus();
    e.preventDefault();
  }
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "20px 0" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d.trim()}
          onKeyDown={e => handleKey(e, i)}
          onPaste={handlePaste}
          onChange={() => { }}
          style={{
            width: 44, height: 52, textAlign: "center", fontSize: 22, fontWeight: 700,
            background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
            borderRadius: 10, color: "#fff", outline: "none", caretColor: "transparent",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "#a78bfa"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
        />
      ))}
    </div>
  );
}
function Countdown({ seconds: initial, onExpire }) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = Math.floor(left / 60).toString().padStart(2, "0");
  const s = (left % 60).toString().padStart(2, "0");
  return <span style={{ color: left < 30 ? "#f87171" : "rgba(255,255,255,0.45)", fontSize: 13 }}>{m}:{s}</span>;
}
function LoginForm() {
  const { switchForm, handleLogin, showToast, navigateTo, closeAuth } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await handleLogin(email, password);
      if (res.data.user.role === "admin") {
        navigateTo("admin");
      } else {
        showToast("Welcome back!");
      }
    } catch (err) {
      if (err.data?.requiresVerification) {
        showToast("Please verify your email first");
        switchForm("verify-email-pending");
        sessionStorage.setItem("pendingEmail", email);
        sessionStorage.setItem("pendingOTPPurpose", "verify-email");
      } else {
        setError(err.message || "Login failed");
      }
    } finally { setLoading(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit}>
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Login to continue your learning journey</p>
      </div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <><span>Logging in</span><Spinner /></> : "Login"}
      </button>
      <div className="auth-footer">
        <p>Don't have an account?{" "}
          <a href="#" onClick={e => { e.preventDefault(); switchForm("register"); }}>Sign Up</a>
        </p>
        <p><a href="#" onClick={e => { e.preventDefault(); switchForm("forgot-password"); }}>Forgot Password?</a></p>
      </div>
    </form>
  );
}
function RegisterForm() {
  const { switchForm, handleRegister, showToast } = useApp();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [studyField, setStudyField] = useState("");
  const [pwError, setPwError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function checkPw(pw, conf) {
    if (conf.length > 0 && pw !== conf) setPwError("Passwords do not match.");
    else setPwError("");
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setPwError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await handleRegister(fullName, email, password, studyField);
      sessionStorage.setItem("pendingEmail", email);
      sessionStorage.setItem("pendingName", fullName);
      sessionStorage.setItem("pendingOTPPurpose", "verify-email");
      showToast("Check your email for a verification code!");
      switchForm("verify-email-pending");
    } catch (err) { setError(err.message || "Registration failed"); }
    finally { setLoading(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit} id='signupForm'>
      <div className="auth-header"><h2>Create Account</h2><p>Join thousands of students learning smarter</p></div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label>Full Name</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required />
      </div>
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={password} onChange={e => { setPassword(e.target.value); checkPw(e.target.value, confirm); }} placeholder="At least 6 characters" required />
      </div>
      <div className="form-group">
        <label>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); checkPw(password, e.target.value); }}
          className={pwError ? "input-error" : ""} placeholder="Confirm your password" required />
        <div className={`form-error${pwError ? " active" : ""}`}>{pwError}</div>
      </div>
      <div className="form-group">
        <label>Study Field</label>
        <select value={studyField} onChange={e => setStudyField(e.target.value)} required>
          <option value="">Select your field</option>
          {STUDY_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <><span>Creating account</span><Spinner /></> : "Create Account"}
      </button>
      <div className="auth-footer">
        <p>Already have an account? <a href="#" onClick={e => { e.preventDefault(); switchForm("login"); }}>Login</a></p>
      </div>
    </form>
  );
}
function OTPVerifyForm() {
  const { switchForm, handleVerifyEmail, showToast, navigateTo } = useApp();
  const email = sessionStorage.getItem("pendingEmail") || "";
  const purpose = sessionStorage.getItem("pendingOTPPurpose") || "verify-email";
  const isReset = purpose === "reset-password";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    if (otp.trim().length < 6) { setError("Enter the 6-digit code"); return; }
    setError(""); setLoading(true);
    try {
      if (isReset) {
        const res = await authAPI.verifyResetOTP({ email, otp: otp.trim() });
        sessionStorage.setItem("resetToken", res.data.resetToken);
        switchForm("reset-password");
      } else {
        await handleVerifyEmail(email, otp.trim());
        showToast("Email verified! Welcome to StudyAI 🎉");
      }
    } catch (err) { setError(err.message || "Invalid code"); }
    finally { setLoading(false); }
  }
  async function handleResend() {
    setResending(true); setError(""); setExpired(false);
    try {
      await authAPI.resendOTP({ email, purpose });
      showToast("New code sent to your email!");
    } catch (err) { setError(err.message); }
    finally { setResending(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit}>
      <div className="auth-header">
        <h2>{isReset ? "Enter Reset Code" : "Verify Your Email"}</h2>
        <p>We sent a 6-digit code to<br /><strong>{email}</strong></p>
      </div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <OTPInput value={otp} onChange={setOtp} />
      <div style={{ textAlign: "center", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Code expires in</span>
        {!expired && <Countdown seconds={120} onExpire={() => setExpired(true)} />}
        {expired && <span style={{ color: "#f87171", fontSize: 13 }}>Expired</span>}
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading || otp.trim().length < 6}>
        {loading ? <><span>Verifying</span><Spinner /></> : "Verify Code"}
      </button>
      <div className="auth-footer">
        <p>
          Didn't receive it?{" "}
          {resending ? <Spinner /> : <a href="#" onClick={e => { e.preventDefault(); handleResend(); }}>Resend code</a>}
        </p>
        <p><a href="#" onClick={e => { e.preventDefault(); switchForm("login"); }}>← Back to Login</a></p>
      </div>
    </form>
  );
}
function ForgotPasswordForm() {
  const { switchForm, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      sessionStorage.setItem("pendingEmail", email);
      sessionStorage.setItem("pendingOTPPurpose", "reset-password");
      showToast("Reset code sent to your email!");
      switchForm("verify-email-pending");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit}>
      <div className="auth-header"><h2>Forgot Password</h2><p>Enter your email to receive a reset code</p></div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <><span>Sending</span><Spinner /></> : "Send Reset Code"}
      </button>
      <div className="auth-footer">
        <p><a href="#" onClick={e => { e.preventDefault(); switchForm("login"); }}>← Back to Login</a></p>
      </div>
    </form>
  );
}
function ResetPasswordForm() {
  const { switchForm, showToast } = useApp();
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    if (newPw !== confirm) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      const resetToken = sessionStorage.getItem("resetToken");
      await authAPI.resetPassword({ resetToken, newPassword: newPw });
      sessionStorage.removeItem("resetToken");
      sessionStorage.removeItem("pendingEmail");
      showToast("Password reset! You can now log in.");
      switchForm("login");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit}>
      <div className="auth-header"><h2>New Password</h2><p>Choose a strong password for your account</p></div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label>New Password</label>
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" required />
      </div>
      <div className="form-group">
        <label>Confirm New Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <><span>Resetting</span><Spinner /></> : "Reset Password"}
      </button>
    </form>
  );
}
function ProfileView() {
  const { currentUser, switchForm, handleLogout, getFormattedStudyHours } = useApp();
  if (!currentUser) return null;
  return (
    <div className="auth-form active">
      <div className="auth-header">
        <div className="profile-avatar">{getInitials(currentUser.fullName)}</div>
        <h2>{currentUser.fullName}</h2>
        <p>{currentUser.studyFieldLabel} Student</p>
      </div>
      <div className="profile-info">
        {[
          ["Email", currentUser.email],
          ["Study Field", currentUser.studyFieldLabel],
          ["Member Since", currentUser.memberSince],
          ["Total Study Hours", `${getFormattedStudyHours()} hours`],
        ].map(([label, val]) => (
          <div key={label} className="profile-info-item">
            <span className="profile-info-label">{label}</span>
            <span className="profile-info-value">{val}</span>
          </div>
        ))}
      </div>
      <div className="btn-group-profile">
        <button className="btn-edit" onClick={() => switchForm("editProfile")}>Edit Profile</button>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
function EditProfileForm() {
  const { currentUser, switchForm, handleUpdateProfile, showToast } = useApp();
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [studyField, setStudyField] = useState(currentUser?.studyField || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const fieldLabel = STUDY_FIELDS.find(([v]) => v === studyField)?.[1] || "Other";
      await handleUpdateProfile({ fullName, studyField, studyFieldLabel: fieldLabel });
      showToast("Profile updated!");
      switchForm("profile");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return (
    <form className="auth-form active" onSubmit={handleSubmit}>
      <div className="auth-header"><h2>Edit Profile</h2><p>Update your account information</p></div>
      {error && <div className="form-error active" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label>Full Name</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Study Field</label>
        <select value={studyField} onChange={e => setStudyField(e.target.value)} required>
          {STUDY_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <><span>Saving</span><Spinner /></> : "Save Changes"}
      </button>
      <div className="auth-footer">
        <p><a href="#" onClick={e => { e.preventDefault(); switchForm("profile"); }}>Cancel</a></p>
      </div>
    </form>
  );
}
export default function AuthOverlay() {
  const { authOpen, authForm, closeAuth } = useApp();
  const formMap = {
    login: <LoginForm />,
    register: <RegisterForm />,
    "verify-email-pending": <OTPVerifyForm />,
    "forgot-password": <ForgotPasswordForm />,
    "reset-password": <ResetPasswordForm />,
    profile: <ProfileView />,
    editProfile: <EditProfileForm />,
  };
  return (
    <div className={`auth-overlay${authOpen ? " active" : ""}`} onClick={e => e.target === e.currentTarget && closeAuth()}>
      <div className="auth-container">
        <button className="close-btn" onClick={closeAuth}>×</button>
        {formMap[authForm] || <LoginForm />}
      </div>
    </div>
  );
}
