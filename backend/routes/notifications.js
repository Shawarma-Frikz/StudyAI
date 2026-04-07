const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

router.get("/", protect, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", protect, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", protect, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", protect, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
