const { verifyAccessToken } = require("../utils/tokens");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
}

async function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select("-password -refreshToken");
    }
  } catch { }
  next();
}

module.exports = { protect, adminOnly, optionalAuth };
