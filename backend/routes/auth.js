const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/mailer");
const {
  signAccessToken, signRefreshToken,
  verifyRefreshToken, setRefreshCookie, clearRefreshCookie,
} = require("../utils/tokens");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many OTP requests. Wait 60 seconds." },
});
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
}
router.post(
  "/register",
  authLimiter,
  [
    body("fullName").trim().isLength({ min: 2 }).withMessage("Full name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("studyField").notEmpty().withMessage("Study field is required"),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { fullName, email, password, studyField } = req.body;
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    let user = existing;
    if (!user) {
      const fieldLabels = {
        "computer-science": "Computer Science", engineering: "Engineering",
        mathematics: "Mathematics", physics: "Physics", chemistry: "Chemistry",
        biology: "Biology", medicine: "Medicine", business: "Business",
        economics: "Economics", literature: "Literature", history: "History",
        psychology: "Psychology", other: "Other",
      };
      user = await User.create({
        fullName, email, password,
        studyField, studyFieldLabel: fieldLabels[studyField] || "Other",
        memberSince: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      });
    } else {
      user.fullName = fullName;
      user.password = password; 
      user.studyField = studyField;
      await user.save();
    }
    const otp = await OTP.createOTP(email, "verify-email");
    await sendOTPEmail({ to: email, name: fullName, otp, purpose: "verify-email" });
    res.status(201).json({
      success: true,
      message: "Account created! Check your email for a verification code.",
      data: { email },
    });
  })
);
router.post(
  "/verify-email",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { email, otp } = req.body;
    const result = await OTP.verifyOTP(email, "verify-email", otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isVerified = true;
    await user.save();
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const salt = await bcrypt.genSalt(10);
    user.refreshToken = await bcrypt.hash(refreshToken, salt);
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);
    sendWelcomeEmail({ to: email, name: user.fullName }).catch(() => { });
    res.json({
      success: true,
      message: "Email verified!",
      data: { accessToken, user },
    });
  })
);
router.post(
  "/resend-otp",
  otpLimiter,
  [body("email").isEmail().normalizeEmail()],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { email, purpose = "verify-email" } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (purpose === "verify-email" && user.isVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }
    const otp = await OTP.createOTP(email, purpose);
    await sendOTPEmail({ to: email, name: user.fullName, otp, purpose });
    res.json({ success: true, message: "OTP resent to your email" });
  })
);
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account has been deactivated" });
    }
    if (!user.isVerified && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Email not verified",
        data: { requiresVerification: true, email: user.email },
      });
    }
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const salt = await bcrypt.genSalt(10);
    user.refreshToken = await bcrypt.hash(refreshToken, salt);
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);
    res.json({
      success: true,
      message: "Login successful",
      data: { accessToken, user },
    });
  })
);
router.post(
  "/forgot-password",
  otpLimiter,
  [body("email").isEmail().normalizeEmail()],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: "If that email exists, a reset code has been sent." });
    }
    const otp = await OTP.createOTP(email, "reset-password");
    await sendOTPEmail({ to: email, name: user.fullName, otp, purpose: "reset-password" });
    res.json({ success: true, message: "Password reset code sent to your email.", data: { email } });
  })
);
router.post(
  "/verify-reset-otp",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { email, otp } = req.body;
    const result = await OTP.verifyOTP(email, "reset-password", otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }
    const jwt = require("jsonwebtoken");
    const resetToken = jwt.sign(
      { email, purpose: "reset-password" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    res.json({ success: true, message: "OTP verified", data: { resetToken } });
  })
);
router.post(
  "/reset-password",
  authLimiter,
  [
    body("resetToken").notEmpty(),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { resetToken, newPassword } = req.body;
    let decoded;
    try {
      const jwt = require("jsonwebtoken");
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: "Reset token invalid or expired" });
    }
    if (decoded.purpose !== "reset-password") {
      return res.status(400).json({ success: false, message: "Invalid token purpose" });
    }
    const user = await User.findOne({ email: decoded.email }).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.password = newPassword; 
    await user.save();
    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  })
);
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: "No refresh token" });
    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: "Refresh token invalid" }); }
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || !user.refreshToken) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    const valid = await bcrypt.compare(token, user.refreshToken);
    if (!valid) return res.status(401).json({ success: false, message: "Refresh token mismatch" });
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const newRefresh = signRefreshToken({ id: user._id });
    const salt = await bcrypt.genSalt(10);
    user.refreshToken = await bcrypt.hash(newRefresh, salt);
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, newRefresh);
    res.json({ success: true, data: { accessToken } });
  })
);
router.post(
  "/logout",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) { user.refreshToken = null; await user.save({ validateBeforeSave: false }); }
    clearRefreshCookie(res);
    res.json({ success: true, message: "Logged out" });
  })
);
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { user: req.user } });
  })
);
router.patch(
  "/update-profile",
  protect,
  [
    body("fullName").optional().trim().isLength({ min: 2 }),
    body("studyField").optional().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const allowed = ["fullName", "studyField", "studyFieldLabel"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: "Profile updated", data: { user } });
  })
);
router.patch(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, message: "Current password incorrect" });
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  })
);
module.exports = router;