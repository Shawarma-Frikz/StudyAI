require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const studyRoomsRoutes = require("./routes/studyrooms");
const notificationsRoutes = require("./routes/notifications");
const documentsRoutes = require("./routes/documents");
const { errorHandler } = require("./middleware/errorHandler");

connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests from this IP" },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/studyrooms", studyRoomsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/documents", documentsRoutes);

app.get("/api/health", (_, res) => res.json({ success: true, status: "ok", env: process.env.NODE_ENV }));

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`StudyAI backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
