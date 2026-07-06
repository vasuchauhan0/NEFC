import { Member, MemberInvestment } from '../types/index.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  BREVO TRANSACTIONAL EMAIL — free-forever tier, no credit card needed.
//  Env vars required (set these in Railway → your service → Variables):
//    BREVO_API_KEY      → from Brevo dashboard → Settings → SMTP & API → API Keys
//    EMAIL_FROM         → e.g. "noreply@yourdomain.com" (must match a verified
//                         Brevo sender/domain; use onboarding test address
//                         while you don't own a domain yet)
//    EMAIL_FROM_NAME    → e.g. "NEFC Investment"  (optional, defaults below)
//    FRONTEND_URL       → e.g. "https://nefc-ten.vercel.app" (used for links)
// ─────────────────────────────────────────────────────────────────────────────

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

// Same maturity math as whatsapp.service.ts / frontend, so numbers always match.
function calculateFDMaturity(principal: number, annualRate: number, years: number) {
  const maturityAmount = Math.round(principal * Math.pow(1 + annualRate / 100, years));
  return { maturityAmount };
}

function calculateRDMaturity(monthlyDeposit: number, annualRate: number, years: number) {
  const P = monthlyDeposit;
  const i = (annualRate / 100) / 12;
  const n = Math.round(years * 12);
  if (i === 0) return { totalDeposited: P * n, maturityAmount: P * n };
  const totalDeposited = P * n;
  const amount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return { totalDeposited, maturityAmount: Math.round(amount) };
}

// ─── Core send function ───────────────────────────────────────────────────────
async function send(toEmail: string, toName: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || 'NEFC Investment';

  if (!apiKey || !fromEmail) {
    console.error('[Email] Missing BREVO_API_KEY or EMAIL_FROM — skipping send.');
    return;
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${errText}`);
  }

  console.log(`✅ Email sent → ${toEmail}`);
}

// ─── Shared email wrapper (matches your brand look) ──────────────────────────
function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e3a5f;margin:0 0 24px;">NEFC Investment</h2>
      ${bodyHtml}
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">NEFC Investment Team</p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. SIGNUP / WELCOME CONFIRMATION — send when a new member account is created
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(member: Member): Promise<void> {
  if (!member.email) return;
  const loginUrl = process.env.FRONTEND_URL || 'https://nefc-ten.vercel.app';

  const html = wrapper(`
    <p style="font-size:16px;">Hi <strong>${member.name}</strong>,</p>
    <p style="color:#334155;">Your NEFC Investment account has been created successfully.</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:4px 0;"><strong>Member ID:</strong> ${member.id}</p>
      <p style="margin:4px 0;"><strong>Member Since:</strong> ${member.memberSince}</p>
      <p style="margin:4px 0;"><strong>City:</strong> ${member.city}</p>
    </div>
    <p><a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Login to your account</a></p>
  `);

  await send(member.email, member.name, 'Welcome to NEFC Investment — Account Confirmed', html);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. PAYMENT RECEIPT — send when admin marks a month's installment as paid
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPaymentReceiptEmail(
  member: Member,
  investment: MemberInvestment,
  month: string // e.g. "June 2026"
): Promise<void> {
  if (!member.email) return;

  const html = wrapper(`
    <p style="font-size:16px;">Dear <strong>${member.name}</strong>,</p>
    <p style="color:#334155;">This confirms your payment for <strong>${month}</strong> has been received.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:4px 0;"><strong>Scheme:</strong> ${investment.schemeType.toUpperCase()} — ${investment.durationYears} Year(s)</p>
      <p style="margin:4px 0;"><strong>Amount:</strong> ${fmt(investment.amount)}</p>
      <p style="margin:4px 0;"><strong>Month:</strong> ${month}</p>
      <p style="margin:4px 0;"><strong>Investment ID:</strong> ${investment.id}</p>
    </div>
    <p style="color:#64748b;font-size:13px;">Keep this email as your payment receipt.</p>
  `);

  await send(member.email, member.name, `Payment Receipt — ${month}`, html);
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. PASSWORD RESET OTP — 6-digit code, matches your admin OTP look & feel
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMemberOtpEmail(
  toEmail: string,
  toName: string,
  code: string
): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e3a5f;margin:0 0 8px;">NEFC Investment Portal</h2>
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Hi ${toName}, you requested to reset your password.</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">Your OTP code</p>
        <h1 style="margin:0;letter-spacing:12px;color:#2563eb;font-size:36px;">${code}</h1>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0;">Valid for 10 minutes only. Do not share this code with anyone. If you didn't request this, ignore this email.</p>
    </div>
  `;

  await send(toEmail, toName, 'NEFC Portal — Password Reset OTP', html);
}

