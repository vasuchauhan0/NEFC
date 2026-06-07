import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

let currentOtp: { code: string; expires: number } | null = null;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
});

router.post('/send', async (req: any, res: any) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentOtp = { code, expires: Date.now() + 5 * 60 * 1000 };

  try {
    await transporter.sendMail({
      from: `"NEFC Security" <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'NEFC Admin OTP - Password Change Request',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#1e3a5f;margin:0 0 8px;">NEFC Investment Portal</h2>
          <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Admin password change requested</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">Your OTP code</p>
            <h1 style="margin:0;letter-spacing:12px;color:#2563eb;font-size:36px;">${code}</h1>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Valid for 5 minutes only. Do not share this code with anyone.</p>
        </div>
      `
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send email. Check ADMIN_EMAIL and GMAIL_APP_PASSWORD in .env' });
  }
});

router.post('/verify', (req: any, res: any) => {
  const { code } = req.body;
  if (!currentOtp) return res.json({ success: false, error: 'No OTP found. Click Send OTP first.' });
  if (Date.now() > currentOtp.expires) {
    currentOtp = null;
    return res.json({ success: false, error: 'OTP expired. Please request a new one.' });
  }
  if (code !== currentOtp.code) return res.json({ success: false, error: 'Incorrect OTP. Try again.' });
  currentOtp = null;
  res.json({ success: true });
});

export default router;