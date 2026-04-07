const express = require("express");
const router = express.Router();
const StudyRoom = require("../models/StudyRoom");
const RoomMessage = require("../models/RoomMessage");
const User = require("../models/User");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const { sendRoomInviteEmail } = require("../utils/mailer");

router.post("/", protect, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: "Room name is required" });

    let code;
    let exists = true;
    while (exists) {
      const crypto = require("crypto");
      code = crypto.randomBytes(3).toString("hex").toUpperCase();
      exists = await StudyRoom.findOne({ code });
    }

    const room = await StudyRoom.create({
      name: name.trim(),
      code,
      creator: req.user._id,
      members: [],
    });

    await room.populate("creator", "fullName email");

    res.status(201).json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
});

router.post("/join", protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ success: false, message: "Room code is required" });

    const room = await StudyRoom.findOne({ code: code.toUpperCase(), isActive: true });
    if (!room)
      return res.status(404).json({ success: false, message: "Room not found or inactive" });

    const alreadyMember = room.isMember(req.user._id);
    if (!alreadyMember) {
      room.members.push({ user: req.user._id });
      await room.save();
    }

    await room.populate("creator", "fullName email");
    await room.populate("members.user", "fullName email");

    res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/invite", protect, async (req, res, next) => {
  try {
    const { email, sendEmail } = req.body;
    const room = await StudyRoom.findById(req.params.roomId).populate("creator", "fullName email");
    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (room.creator._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Only the room owner can invite" });

    if (!email || !email.trim())
      return res.status(400).json({ success: false, message: "Email is required" });

    const invitee = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });

    if (sendEmail) {
      const clientUrl = process.env.CLIENT_URL;
      if (invitee) {
        await sendRoomInviteEmail({
          to: invitee.email,
          recipientName: invitee.fullName,
          inviterName: req.user.fullName,
          roomName: room.name,
          roomCode: room.code,
          clientUrl,
        });
        if (!room.isMember(invitee._id)) {
          room.members.push({ user: invitee._id });
          await room.save();
        }
        return res.json({ success: true, message: "Invitation email sent and user added to room" });
      } else {
        await sendRoomInviteEmail({
          to: email.toLowerCase().trim(),
          recipientName: null,
          inviterName: req.user.fullName,
          roomName: room.name,
          roomCode: room.code,
          clientUrl,
        });
        return res.json({ success: true, message: "Invitation email sent" });
      }
    }

    if (!invitee)
      return res.status(404).json({ success: false, message: "User not found" });

    if (room.isMember(invitee._id))
      return res.status(400).json({ success: false, message: "User is already a member" });

    room.members.push({ user: invitee._id });
    await room.save();

    res.json({
      success: true,
      message: "User invited successfully",
      data: { invitee: { _id: invitee._id, fullName: invitee.fullName, email: invitee.email } },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:roomId/kick/:userId", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (room.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Only the room owner can kick members" });

    if (req.params.userId === req.user._id.toString())
      return res.status(400).json({ success: false, message: "Cannot kick yourself" });

    const before = room.members.length;
    room.members = room.members.filter((m) => m.user.toString() !== req.params.userId);

    if (room.members.length === before)
      return res.status(404).json({ success: false, message: "Member not found in room" });

    await room.save();
    res.json({ success: true, message: "Member kicked from room" });
  } catch (err) {
    next(err);
  }
});

router.get("/search-users", protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.json({ success: true, data: { users: [] } });

    const users = await User.find({
      isActive: true,
      isVerified: true,
      _id: { $ne: req.user._id },
      $or: [
        { fullName: { $regex: q.trim(), $options: "i" } },
        { email: { $regex: q.trim(), $options: "i" } },
      ],
    })
      .select("fullName email")
      .limit(8);

    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

router.get("/my", protect, async (req, res, next) => {
  try {
    const rooms = await StudyRoom.find({
      isActive: true,
      $or: [{ creator: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("creator", "fullName email")
      .populate("members.user", "fullName email")
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: { rooms } });
  } catch (err) {
    next(err);
  }
});

router.get("/:roomId", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId)
      .populate("creator", "fullName email")
      .populate("members.user", "fullName email");

    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (!room.isMember(req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });

    res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
});

router.get("/:roomId/messages", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (!room.isMember(req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });

    const { since } = req.query;
    const query = { room: room._id };
    if (since) query.createdAt = { $gt: new Date(since) };

    const messages = await RoomMessage.find(query)
      .populate("sender", "fullName email")
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ success: true, data: { messages } });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/messages", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (!room.isMember(req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });

    const { text, file, mentions } = req.body;

    if (!text?.trim() && !file)
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    if (file?.data && file.data.length > 5 * 1024 * 1024)
      return res.status(413).json({ success: false, message: "File too large (max 5MB)" });

    const msg = await RoomMessage.create({
      room: room._id,
      sender: req.user._id,
      text: text?.trim() || "",
      file: file || undefined,
      mentions: mentions || [],
    });

    await msg.populate("sender", "fullName email");

    room.updatedAt = new Date();
    await room.save();

    const otherMemberIds = [
      ...(room.creator.toString() !== req.user._id.toString() ? [room.creator] : []),
      ...room.members
        .filter((m) => m.user.toString() !== req.user._id.toString())
        .map((m) => m.user),
    ];

    if (otherMemberIds.length > 0) {
      const preview = msg.file && !msg.text
        ? `📎 Shared a file: ${msg.file.name}`
        : msg.text.length > 80
          ? msg.text.slice(0, 80) + "…"
          : msg.text;

      await Notification.insertMany(
        otherMemberIds.map((uid) => ({
          user: uid,
          type: "room_message",
          title: `💬 New message in ${room.name}`,
          body: `${msg.sender.fullName}: ${preview}`,
          meta: {
            roomId: room._id,
            roomName: room.name,
            roomCode: room.code,
            senderName: msg.sender.fullName,
          },
        }))
      );
    }

    res.status(201).json({ success: true, data: { message: msg } });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/messages/:messageId/report", protect, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim())
      return res.status(400).json({ success: false, message: "Reason is required" });

    const room = await StudyRoom.findById(req.params.roomId);
    if (!room || !room.isActive)
      return res.status(404).json({ success: false, message: "Room not found" });

    if (!room.isMember(req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });

    const message = await RoomMessage.findById(req.params.messageId);
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    if (message.sender.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: "Cannot report your own message" });

    const existingReport = await Report.findOne({
      reporter: req.user._id,
      message: message._id,
    });

    if (existingReport)
      return res.status(400).json({ success: false, message: "You already reported this message" });

    await Report.create({
      reporter: req.user._id,
      reportedUser: message.sender,
      message: message._id,
      room: room._id,
      reason: reason.trim(),
    });

    res.status(201).json({ success: true, message: "Report submitted" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:roomId/leave", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room.creator.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: "Creator cannot leave. Delete the room instead." });

    room.members = room.members.filter((m) => m.user.toString() !== req.user._id.toString());
    await room.save();

    res.json({ success: true, message: "Left the room" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:roomId", protect, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Only creator can delete room" });

    room.isActive = false;
    await room.save();

    res.json({ success: true, message: "Room deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
