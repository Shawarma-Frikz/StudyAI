const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const STUDY_FIELDS = [
  "computer-science", "engineering", "mathematics", "physics", "chemistry",
  "biology", "medicine", "business", "economics", "literature", "history",
  "psychology", "other",
];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    studyField: {
      type: String,
      enum: STUDY_FIELDS,
      default: "other",
    },
    studyFieldLabel: {
      type: String,
      default: "Other",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    totalStudyMs: {
      type: Number,
      default: 0,
    },
    studyStreak: {
      type: Number,
      default: 0,
    },
    lastActivityDate: {
      type: String,
      default: null,
    },
    memberSince: {
      type: String,
      default: () =>
        new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bannedUntil: {
      type: Date,
      default: null,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform(_, ret) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
