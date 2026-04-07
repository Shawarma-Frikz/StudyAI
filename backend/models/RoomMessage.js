const mongoose = require("mongoose");

const roomMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyRoom",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
      maxlength: [4000, "Message too long"],
    },
    file: {
      name: { type: String },
      type: { type: String },
      size: { type: String },
      data: { type: String },
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoomMessage", roomMessageSchema);
