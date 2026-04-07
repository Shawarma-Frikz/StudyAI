const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const OTP = require("../models/OTP");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const { protect, adminOnly } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendAdminNoticeEmail } = require("../utils/mailer");

router.use(protect, adminOnly);

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
}

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const [totalUsers, verifiedUsers, adminCount, recentUsers, otpCount, pendingReports] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "student", isVerified: true }),
      User.countDocuments({ role: "admin" }),
      User.find({ role: "student" }).sort({ createdAt: -1 }).limit(5).select("fullName email studyFieldLabel isVerified createdAt"),
      OTP.countDocuments({ expiresAt: { $gt: new Date() }, used: false }),
      Report.countDocuments({ status: "pending" }),
    ]);
    const unverifiedUsers = totalUsers - verifiedUsers;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, role: "student" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const fieldDist = await User.aggregate([
      { $match: { role: "student", isVerified: true } },
      { $group: { _id: "$studyFieldLabel", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      success: true,
      data: {
        stats: { totalUsers, verifiedUsers, unverifiedUsers, adminCount, activePendingOTPs: otpCount, pendingReports },
        recentUsers,
        dailySignups,
        fieldDistribution: fieldDist,
      },
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const search = req.query.search || "";
    const roleFilter = req.query.role || "";
    const verifiedFilter = req.query.verified;
    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (roleFilter) filter.role = roleFilter;
    if (verifiedFilter === "true") filter.isVerified = true;
    if (verifiedFilter === "false") filter.isVerified = false;
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -refreshToken"),
      User.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: { user } });
  })
);

router.patch(
  "/users/:id",
  [
    body("role").optional().isIn(["student", "admin"]),
    body("isVerified").optional().isBoolean(),
    body("isActive").optional().isBoolean(),
    body("isBanned").optional().isBoolean(),
    body("bannedUntil").optional(),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    if (req.params.id === req.user._id.toString() && req.body.role === "student") {
      return res.status(400).json({ success: false, message: "Cannot demote yourself" });
    }
    const allowed = ["fullName", "role", "isVerified", "isActive", "studyField", "studyFieldLabel", "isBanned", "bannedUntil"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", data: { user } });
  })
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deactivated" });
  })
);

router.post(
  "/users/:id/verify",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User verified", data: { user } });
  })
);

router.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const statusFilter = req.query.status || "";
    const filter = {};
    if (statusFilter) filter.status = statusFilter;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter", "fullName email")
        .populate("reportedUser", "fullName email isBanned bannedUntil")
        .populate({ path: "message", select: "text file createdAt" })
        .populate("room", "name code")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

router.post(
  "/reports/:reportId/notice",
  asyncHandler(async (req, res) => {
    const { noticeMessage } = req.body;
    if (!noticeMessage || !noticeMessage.trim())
      return res.status(400).json({ success: false, message: "Notice message is required" });

    const report = await Report.findById(req.params.reportId)
      .populate("reportedUser", "fullName email")
      .populate("reporter", "fullName email")
      .populate({ path: "message", select: "text file" })
      .populate("room", "name");

    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

    await sendAdminNoticeEmail({
      to: report.reportedUser.email,
      recipientName: report.reportedUser.fullName,
      noticeMessage: noticeMessage.trim(),
      reportReason: report.reason,
    });

    await Notification.create({
      user: report.reportedUser._id,
      type: "admin_notice",
      title: "⚠️ Administrative Notice",
      body: noticeMessage.trim(),
      meta: { reportId: report._id },
    });

    report.status = "noticed";
    report.adminNote = noticeMessage.trim();
    await report.save();

    res.json({ success: true, message: "Notice sent to user" });
  })
);

router.post(
  "/reports/:reportId/ban",
  asyncHandler(async (req, res) => {
    const { days } = req.body;
    const banDays = parseInt(days, 10);
    if (!banDays || banDays < 1 || banDays > 365)
      return res.status(400).json({ success: false, message: "Ban duration must be between 1 and 365 days" });

    const report = await Report.findById(req.params.reportId)
      .populate("reportedUser", "fullName email _id");

    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

    const bannedUntil = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(report.reportedUser._id, {
      isBanned: true,
      bannedUntil,
    });

    await Notification.create({
      user: report.reportedUser._id,
      type: "admin_notice",
      title: "🔒 Account Suspended",
      body: `Your account has been suspended for ${banDays} day${banDays !== 1 ? "s" : ""} due to a violation of our community guidelines. It will be automatically lifted on ${bannedUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
      meta: { reportId: report._id },
    });

    report.status = "banned";
    report.adminNote = `Banned for ${banDays} day${banDays !== 1 ? "s" : ""}`;
    await report.save();

    res.json({ success: true, message: `User banned for ${banDays} day${banDays !== 1 ? "s" : ""}` });
  })
);

router.patch(
  "/reports/:reportId/dismiss",
  asyncHandler(async (req, res) => {
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { status: "dismissed" },
      { new: true }
    );
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

    res.json({ success: true, message: "Report dismissed" });
  })
);

module.exports = router;
