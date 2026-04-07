const nodemailer = require("nodemailer");
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  return transporter;
}
function wrapHTML(title, bodyHTML) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#0a0e1a; font-family:'Segoe UI',sans-serif; }
    .wrapper { max-width:560px; margin:40px auto; background:#111827; border-radius:16px;
               overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,.5); }
    .header { background:linear-gradient(135deg,#667eea,#764ba2);
              padding:36px 40px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:24px; font-weight:700; letter-spacing:-.5px; }
    .header p  { color:rgba(255,255,255,.75); margin:6px 0 0; font-size:14px; }
    .body { padding:36px 40px; color:#e2e8f0; }
    .body p { line-height:1.7; margin:0 0 16px; font-size:15px; }
    .otp-box { background:#1e2a3a; border:2px dashed #667eea; border-radius:12px;
               text-align:center; padding:28px; margin:24px 0; }
    .otp-code { font-size:42px; font-weight:800; letter-spacing:10px;
                color:#a78bfa; font-family:monospace; }
    .otp-expires { color:rgba(255,255,255,.45); font-size:12px; margin-top:8px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#667eea,#764ba2);
           color:#fff; text-decoration:none; padding:14px 32px; border-radius:50px;
           font-weight:600; font-size:15px; margin:8px 0; }
    .footer { background:#0d1117; padding:20px 40px; text-align:center;
              color:rgba(255,255,255,.3); font-size:12px; }
    .divider { border:none; border-top:1px solid #1e2a3a; margin:20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📚 StudyAI</h1>
      <p>${title}</p>
    </div>
    <div class="body">${bodyHTML}</div>
    <div class="footer">
      © 2026 StudyAI · This email was sent automatically. Please do not reply.
    </div>
  </div>
</body>
</html>`;
}
async function sendOTPEmail({ to, name, otp, purpose }) {
  const isReset = purpose === "reset-password";
  const title = isReset ? "Reset Your Password" : "Verify Your Email";
  const intro = isReset
    ? `Hi <strong>${name}</strong>, we received a request to reset your StudyAI password.`
    : `Hi <strong>${name}</strong>, welcome to StudyAI! Please verify your email address.`;
  const note = isReset
    ? "If you didn't request a password reset, you can safely ignore this email."
    : "If you didn't create a StudyAI account, you can safely ignore this email.";
  const html = wrapHTML(title, `
    <p>${intro}</p>
    <p>Use the verification code below. It expires in <strong>${process.env.OTP_EXPIRES_MINUTES} minutes</strong>.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expires">Expires in ${process.env.OTP_EXPIRES_MINUTES} minutes</div>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:rgba(255,255,255,.45)">${note}</p>
  `);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "StudyAI <noreply@studyai.tn>",
    to,
    subject: isReset ? "🔑 StudyAI — Password Reset Code" : "✅ StudyAI — Email Verification Code",
    html,
  });
}
async function sendWelcomeEmail({ to, name }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const html = wrapHTML("Welcome to StudyAI!", `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your account has been verified and you're all set to start learning smarter with AI.</p>
    <p>Here's what you can do:</p>
    <ul style="color:#e2e8f0;line-height:1.9">
      <li>📄 Upload your study documents (PDF, images, text)</li>
      <li>🤖 Chat with your AI study assistant</li>
      <li>📝 Generate auto-quizzes from your notes</li>
      <li>📊 Track your progress on the dashboard</li>
    </ul>
    <p style="text-align:center;margin-top:28px">
      <a class="btn" href="${clientUrl}">Start Studying →</a>
    </p>
  `);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "StudyAI <noreply@studyai.tn>",
    to,
    subject: "🎉 Welcome to StudyAI — You're verified!",
    html,
  });
}
async function sendRoomInviteEmail({ to, recipientName, inviterName, roomName, roomCode, clientUrl }) {
  const greeting = recipientName ? `Hi <strong>${recipientName}</strong>,` : "Hello,";
  const html = wrapHTML("You're Invited to a Study Room!", `
    <p>${greeting}</p>
    <p><strong>${inviterName}</strong> has invited you to join the study room <strong>${roomName}</strong> on StudyAI.</p>
    <div class="otp-box">
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:10px;">Room Code</div>
      <div class="otp-code">${roomCode}</div>
      <div class="otp-expires">Use this code to join the room</div>
    </div>
    <p style="text-align:center;margin-top:28px">
      <a class="btn" href="${clientUrl}">Join on StudyAI →</a>
    </p>
    <hr class="divider"/>
    <p style="font-size:13px;color:rgba(255,255,255,.45)">If you don't have an account yet, sign up at StudyAI and use the code above to join the room.</p>
  `);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "StudyAI <noreply@studyai.tn>",
    to,
    subject: `📚 ${inviterName} invited you to "${roomName}" on StudyAI`,
    html,
  });
}

async function sendAdminNoticeEmail({ to, recipientName, noticeMessage, reportReason }) {
  const html = wrapHTML("Notice from StudyAI Administration", `
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p>The StudyAI administration team has reviewed a report regarding your recent activity and would like to send you the following notice:</p>
    <div style="background:#1e2a3a;border-left:4px solid #f87171;border-radius:8px;padding:20px 24px;margin:20px 0;">
      <div style="font-size:13px;color:#f87171;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Admin Notice</div>
      <div style="color:#e2e8f0;line-height:1.7;font-size:15px;">${noticeMessage}</div>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:rgba(255,255,255,.45)">This notice was sent following a community report. Please review our community guidelines to ensure your contributions remain respectful and appropriate for all users.</p>
  `);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "StudyAI <noreply@studyai.tn>",
    to,
    subject: "⚠️ StudyAI — Administrative Notice",
    html,
  });
}

module.exports = { sendOTPEmail, sendWelcomeEmail, sendRoomInviteEmail, sendAdminNoticeEmail };
