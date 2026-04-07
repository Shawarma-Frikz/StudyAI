# StudyAI — MERN Full-Stack

Complete MERN (MongoDB · Express · React · Node.js) application with:
- JWT authentication (access + refresh tokens)
- Email verification via OTP (Nodemailer)
- Forgot password → OTP → reset password flow
- Admin dashboard with user management
- Hardcoded admin: `admin@studyai.tn` / `shawarma`

---

## Project Structure

```
studyai/                      ← React frontend (Vite)
├── .env.example
├── index.html
├── vite.config.js
└── src/
    ├── App.jsx               ← Shell + routing (hero/docs/chat/dashboard/admin)
    ├── main.jsx
    ├── styles.css
    ├── services/
    │   └── api.js            ← All API calls (fetch wrapper, token management)
    ├── context/
    │   └── AppContext.jsx    ← Global state, bootstraps auth on load
    └── components/
        ├── Navbar.jsx        ← Shows avatar when logged in
        ├── Particles.jsx
        ├── AuthOverlay.jsx   ← Login / Register / OTP / ForgotPw / ResetPw / Profile
        ├── HeroSection.jsx
        ├── FeaturesSection.jsx
        ├── DocsSection.jsx
        ├── ChatSection.jsx
        ├── DashboardSection.jsx
        ├── QuizOverlay.jsx
        ├── AdminDashboard.jsx ← Full admin panel (stats + user management)
        ├── Footer.jsx
        └── Toast.jsx

studyai-backend/              ← Express API
├── .env.example
├── server.js                 ← Entry point
├── seed.js                   ← Creates admin user
├── config/
│   └── db.js                 ← Mongoose connection
├── models/
│   ├── User.js               ← Schema: students & admins, bcrypt, soft delete
│   └── OTP.js                ← Schema: hashed OTP, TTL expiry, attempt limiting
├── routes/
│   ├── auth.js               ← /api/auth/* (register/login/OTP/reset/logout/me)
│   └── admin.js              ← /api/admin/* (dashboard/users CRUD)
├── middleware/
│   ├── auth.js               ← protect(), adminOnly(), optionalAuth()
│   └── errorHandler.js       ← Central error handler + asyncHandler
└── utils/
    ├── mailer.js             ← Nodemailer: OTP + welcome emails (HTML)
    └── tokens.js             ← JWT sign/verify, httpOnly cookie helpers
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- SMTP credentials (Gmail App Password recommended)

---

### 1. Backend

```bash
cd studyai-backend
npm install
```

Edit `.env`:
```
MONGO_URI=mongodb://127.0.0.1:27017/studyai
JWT_SECRET=change_this_to_something_long_random
JWT_REFRESH_SECRET=change_this_too
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16char_app_password
EMAIL_FROM=StudyAI <noreply@studyai.tn>
ADMIN_EMAIL=admin@studyai.tn
ADMIN_PASSWORD=shawarma
CLIENT_URL=http://localhost:5173
```

Seed the admin account:
```bash
node seed.js
```

Start the server:
```bash
npm run dev     # development (nodemon)
npm start       # production
```

API runs at `http://localhost:5000`

---

### 2. Frontend

```bash
cd studyai
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Auth Flows

### Register
1. User fills name / email / password / study field
2. Backend creates unverified user, sends 6-digit OTP via email
3. User enters OTP → backend verifies hash → marks `isVerified=true`
4. Tokens issued, welcome email sent, user is logged in

### Login
- Standard email+password → access token (7d) + refresh token (30d httpOnly cookie)
- Unverified students get blocked with a prompt to verify

### Admin Login
- `admin@studyai.tn` / `shawarma` → skips email verification → redirects to Admin Dashboard

### Forgot Password
1. User enters email → OTP sent
2. User enters OTP → short-lived `resetToken` issued
3. User submits new password with `resetToken` → password updated

### Token Refresh
- Frontend bootstraps on load by calling `POST /api/auth/refresh` (uses httpOnly cookie)
- If refresh succeeds → access token restored silently (no login prompt)

---

## API Reference

| Method | Endpoint                       | Auth     | Description                    |
|--------|-------------------------------|----------|--------------------------------|
| POST   | /api/auth/register             | —        | Register + send OTP            |
| POST   | /api/auth/verify-email         | —        | Verify OTP → login             |
| POST   | /api/auth/resend-otp           | —        | Resend OTP                     |
| POST   | /api/auth/login                | —        | Login                          |
| POST   | /api/auth/logout               | Bearer   | Logout + clear cookie          |
| GET    | /api/auth/me                   | Bearer   | Get current user               |
| PATCH  | /api/auth/update-profile       | Bearer   | Update profile                 |
| PATCH  | /api/auth/change-password      | Bearer   | Change password (authenticated)|
| POST   | /api/auth/forgot-password      | —        | Send reset OTP                 |
| POST   | /api/auth/verify-reset-otp     | —        | Verify reset OTP → resetToken  |
| POST   | /api/auth/reset-password       | —        | Set new password               |
| POST   | /api/auth/refresh              | Cookie   | Refresh access token           |
| GET    | /api/admin/dashboard           | Admin    | Platform stats                 |
| GET    | /api/admin/users               | Admin    | Paginated user list            |
| GET    | /api/admin/users/:id           | Admin    | Single user                    |
| PATCH  | /api/admin/users/:id           | Admin    | Update user (role/status/etc.) |
| DELETE | /api/admin/users/:id           | Admin    | Soft-delete user               |
| POST   | /api/admin/users/:id/verify    | Admin    | Force-verify user email        |

---

## Security Notes

- Passwords hashed with **bcrypt** (12 salt rounds)
- OTPs hashed with **bcrypt** (10 rounds), max 5 attempts, auto-deleted by MongoDB TTL
- Refresh tokens stored **hashed** in DB, rotated on each use
- Rate limiting: 20 req/15min on auth endpoints, 3 req/min on OTP send
- `httpOnly` + `sameSite` cookies for refresh token
- CORS restricted to `CLIENT_URL`
- Soft-delete (users are deactivated, not removed)

---

## Gmail Setup (for emails)

1. Enable 2-Factor Authentication on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Create an app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`
