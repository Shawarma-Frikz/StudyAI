# StudyAI

StudyAI is an AI-assisted learning platform for students. It combines document management, AI chat support, collaborative study rooms, notifications, moderation tools, and OCR to help learners study faster and stay organized.

## Project Solution

Many students struggle with scattered notes, weak collaboration, and no central place to revise effectively.

StudyAI solves this by offering:
- secure authentication and profile management
- personal document space
- AI chat experience integrated in the learning flow
- real-time style collaboration through study rooms and messaging
- OCR workflow (image -> extracted text -> editable content -> PDF export)
- admin moderation dashboard for user/report management

## Tech Stack

### Frontend
- React 18
- Vite 5
- Context API for app state
- Fetch API for backend communication

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT auth (access token + refresh token cookie)
- Express middleware: CORS, rate limiting, validation, error handling
- Nodemailer for email workflows (OTP, welcome, invites, admin notices)

### OCR Service
- Python Flask
- OCR.space API integration
- ReportLab for PDF generation

## Main Features

- user registration, OTP email verification, login, logout, password reset
- refresh-token based session flow
- profile update and password change
- document CRUD (create/list/rename/delete)
- study room lifecycle (create/join/invite/kick/leave/delete)
- room messaging with optional file attachment support
- report message workflow for moderation
- notification center (unread count, mark read, mark all, delete)
- admin dashboard with user analytics and report actions (notice, ban, dismiss)
- OCR modal: upload image, extract text, edit text, download PDF, send text to chat

## Architecture Overview

StudyAI has 3 running services:

1. Frontend client: http://localhost:5173
2. Backend API: http://localhost:5000/api
3. Python OCR service: http://localhost:5001

General flow:
- frontend sends requests to backend for auth, documents, rooms, notifications, and admin actions
- backend persists data in MongoDB
- frontend OCR feature calls Python service directly for text extraction and PDF generation

## Project Structure

```text
StudyAI/
|- README.md
|- backend/
|  |- server.js
|  |- seed.js
|  |- package.json
|  |- .env.example
|  |- config/
|  |- middleware/
|  |- models/
|  |- routes/
|  |- utils/
|- frontend/
|  |- index.html
|  |- package.json
|  |- vite.config.js
|  |- src/
|     |- components/
|     |- context/
|     |- services/
|- python/
|  |- app.py
|  |- requirements.txt
```

## Prerequisites

Install these first:
- Node.js 18+
- npm 9+
- Python 3.10+
- MongoDB (local or cloud URI)

## Setup and Run (After Cloning from GitHub)

Open 3 terminals in the project root and follow these steps.

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and fill required values:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_access_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email
SMTP_PASS=your_app_password
EMAIL_FROM=StudyAI <noreply@studyai.tn>

ADMIN_EMAIL=admin@studyai.tn
ADMIN_PASSWORD=shawarma
ADMIN_NAME=Admin

CLIENT_URL=http://localhost:5173
OTP_EXPIRES_MINUTES=2
```

Seed admin user:

```bash
node seed.js
```

Run backend:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Run frontend:

```bash
npm run dev
```

### 3. Python OCR Service Setup

```bash
cd python
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies and run:

```bash
pip install -r requirements.txt
python app.py
```

Optional but recommended environment variable:

```env
OCR_SPACE_API_KEY=your_ocr_space_api_key
```

## Default Local URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health
- OCR health: http://localhost:5001/health

## Default Seeded Admin Account

- Email: admin@studyai.tn
- Password: shawarma

Change these values in `backend/.env` before production use.

## API Route Groups

- `/api/auth`
- `/api/admin`
- `/api/documents`
- `/api/studyrooms`
- `/api/notifications`

## Common Issues

If a command exits with code 1, check the following:

1. You installed dependencies in each folder (`backend`, `frontend`, `python`).
2. `backend/.env` exists and has valid `MONGO_URI`, JWT, and SMTP values.
3. MongoDB is running and reachable.
4. Backend is running before frontend requests auth/API routes.
5. Python dependencies are installed in the active virtual environment.
6. Ports 5000, 5001, 5173 are not already in use.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
