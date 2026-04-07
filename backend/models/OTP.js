const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["verify-email", "reset-password"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
otpSchema.statics.createOTP = async function (email, purpose) {
  await this.deleteMany({ email: email.toLowerCase(), purpose });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || "10", 10);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(code, salt);
  await this.create({ email: email.toLowerCase(), purpose, otpHash, expiresAt });
  return code;
};
otpSchema.statics.verifyOTP = async function (email, purpose, code) {
  const record = await this.findOne({
    email: email.toLowerCase(),
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  }).select("+otpHash");
  if (!record) return { valid: false, reason: "OTP expired or not found" };
  if (record.attempts >= 5) {
    await record.deleteOne();
    return { valid: false, reason: "Too many attempts" };
  }
  const match = await bcrypt.compare(code, record.otpHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { valid: false, reason: "Invalid OTP" };
  }
  record.used = true;
  await record.save();
  return { valid: true };
};
module.exports = mongoose.model("OTP", otpSchema);
