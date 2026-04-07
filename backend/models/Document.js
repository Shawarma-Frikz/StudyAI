const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Document name is required"],
      trim: true,
      maxlength: [255, "Name too long"],
    },
    type: {
      type: String,
      enum: ["pdf", "image", "text"],
      default: "text",
    },
    size: {
      type: String,
      default: "0 KB",
    },
    mimeType: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);