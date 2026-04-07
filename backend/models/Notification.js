const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["admin_notice", "room_message"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    meta: {
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyRoom" },
      roomName: { type: String },
      roomCode: { type: String },
      senderName: { type: String },
      reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
