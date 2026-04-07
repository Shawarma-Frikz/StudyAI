const mongoose = require("mongoose");
const crypto = require("crypto");

function generateRoomCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

const studyRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
      minlength: [2, "Room name must be at least 2 characters"],
      maxlength: [60, "Room name cannot exceed 60 characters"],
    },
    code: {
      type: String,
      unique: true,
      default: generateRoomCode,
      uppercase: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

studyRoomSchema.methods.isMember = function (userId) {
  return (
    this.creator.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString())
  );
};

module.exports = mongoose.model("StudyRoom", studyRoomSchema);
