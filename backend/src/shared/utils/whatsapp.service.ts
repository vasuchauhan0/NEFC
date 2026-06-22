 
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { Member, MemberInvestment } from '../types/index.ts';
 
// Auth session is saved here so you only scan the QR once.
// Locally this defaults to ./wa_auth_session (next to your backend code).
// On Railway, set env var WA_AUTH_PATH to your mounted volume path,
// e.g. WA_AUTH_PATH=/data/wa_auth_session
const AUTH_FOLDER = process.env.WA_AUTH_PATH
  ? path.resolve(process.env.WA_AUTH_PATH)
  : path.resolve(process.cwd(), 'wa_auth_session');
 
let sock: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;
 
// ─── Connect / Re-connect ────────────────────────────────────────────────────
async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();
 
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });
 
  sock.ev.on('creds.update', saveCreds);
 
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
 
    if (qr) {
      console.log('\n📱 Scan this QR with WhatsApp (Linked Devices):\n');
      qrcode.generate(qr, { small: true });
    }
 
    if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp connected!');
    }
 
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️  WhatsApp disconnected. Reconnecting:', shouldReconnect);
      if (shouldReconnect) connect();
    }
  });
}
 
// ─── Wait until socket is ready ──────────────────────────────────────────────
function waitForConnection(timeoutMs = 90000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isConnected) return resolve();
    const start = Date.now();
    const iv = setInterval(() => {
      if (isConnected) { clearInterval(iv); resolve(); }
      else if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error('WhatsApp connection timeout')); }
    }, 500);
  });
}
 
// ─── Core send function ───────────────────────────────────────────────────────
// phone: Indian number like "919876543210" (no + or spaces)
async function send(phone: string, message: string): Promise<void> {
  if (!sock) await connect();
  await waitForConnection();
  const jid = `${phone}@s.whatsapp.net`;
  await sock!.sendMessage(jid, { text: message });
  console.log(`✅ WhatsApp sent → ${phone}`);
}
 
function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
 
// ─────────────────────────────────────────────────────────────────────────────
//  MATURITY CALCULATIONS — mirrors frontend/src/shared/utils/index.ts exactly
//  so WhatsApp messages always match what members see on the website.
// ─────────────────────────────────────────────────────────────────────────────
 
// FD: one-time lump sum, compounded annually
function calculateFDMaturity(principal: number, annualRate: number, years: number) {
  const maturityAmount = Math.round(principal * Math.pow(1 + annualRate / 100, years));
  const interestEarned = maturityAmount - principal;
  return { maturityAmount, interestEarned };
}
 
// RD: recurring monthly deposit, compounded monthly
function calculateRDMaturity(monthlyDeposit: number, annualRate: number, years: number) {
  const P = monthlyDeposit;
  const i = (annualRate / 100) / 12;
  const n = Math.round(years * 12);
 
  if (i === 0) {
    const totalDeposited = P * n;
    return { totalDeposited, maturityAmount: totalDeposited, interestEarned: 0 };
  }
 
  const totalDeposited = P * n;
  const amount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const maturityAmount = Math.round(amount);
  const interestEarned = Math.max(0, maturityAmount - totalDeposited);
 
  return { totalDeposited, maturityAmount, interestEarned };
}
 
// ─────────────────────────────────────────────────────────────────────────────
//  MESSAGE TEMPLATES — match your real Member / MemberInvestment types
// ─────────────────────────────────────────────────────────────────────────────
 
// 1. Welcome message when admin registers a new member
export async function sendWelcomeMessage(member: Member): Promise<void> {
  const phone = member.phone?.replace(/\D/g, ''); // strip non-digits (+, spaces, etc.)
  if (!phone) return;
 
  const message =
    `🎉 *Welcome to NEFC Investment, ${member.name}!*\n\n` +
    `Your account has been created successfully.\n\n` +
    `👤 *Member ID:* ${member.id}\n` +
    `📅 *Member Since:* ${member.memberSince}\n` +
    `📍 *City:* ${member.city}\n\n` +
    `Login to your account:\n` +
    `🔗 https://nefc-ten.vercel.app\n\n` +
    `For help, contact us anytime.\n` +
    `_NEFC Investment Team_ 🙏`;
 
  await send(phone, message);
}
 
// 2. Investment update — send when admin adds an investment
export async function sendInvestmentUpdateMessage(
  member: Member,
  investment: MemberInvestment
): Promise<void> {
  const phone = member.phone?.replace(/\D/g, '');
  if (!phone) return;
 
  const isRD = investment.schemeType === 'rd';
 
  let amountLine: string;
  let maturityAmount: number;
 
  if (isRD) {
    const { totalDeposited, maturityAmount: maturity } = calculateRDMaturity(
      investment.amount,
      investment.interestPct,
      investment.durationYears
    );
    maturityAmount = maturity;
    amountLine = `💰 *Monthly Deposit:* ${fmt(investment.amount)}\n` +
                 `🧮 *Total Deposit (over term):* ${fmt(totalDeposited)}`;
  } else {
    const { maturityAmount: maturity } = calculateFDMaturity(
      investment.amount,
      investment.interestPct,
      investment.durationYears
    );
    maturityAmount = maturity;
    amountLine = `💰 *Amount Invested:* ${fmt(investment.amount)}`;
  }
 
  const message =
    `📊 *Investment Update — NEFC Investment*\n\n` +
    `Hello *${member.name}*, your investment details:\n\n` +
    `📦 *Scheme:* ${investment.schemeType.toUpperCase()} — ${investment.durationYears} Year(s)\n` +
    `${amountLine}\n` +
    `📅 *Start Date:* ${investment.startDate}\n` +
    `🎯 *Maturity Date:* ${investment.maturityDate}\n` +
    `💼 *Maturity Amount:* ${fmt(maturityAmount)}\n` +
    `✅ *Status:* ${investment.status}\n\n` +
    `View your full portfolio:\n` +
    `🔗 https://nefc-ten.vercel.app\n\n` +
    `_NEFC Investment Team_ 💹`;
 
  await send(phone, message);
}
 
// 3. Payment confirmed — when admin marks a month's RD installment as paid
export async function sendPaymentConfirmedMessage(
  member: Member,
  investment: MemberInvestment,
  month: string // e.g. "June 2026"
): Promise<void> {
  const phone = member.phone?.replace(/\D/g, '');
  if (!phone) return;
 
  const message =
    `✅ *Payment Received — NEFC Investment*\n\n` +
    `Dear *${member.name}*,\n\n` +
    `Your payment for *${month}* has been confirmed.\n\n` +
    `📦 *Scheme:* ${investment.schemeType.toUpperCase()}\n` +
    `💰 *Amount:* ${fmt(investment.amount)}\n` +
    `📅 *Month:* ${month}\n\n` +
    `Thank you for staying on track! 💪\n\n` +
    `_NEFC Investment Team_ 🙏`;
 
  await send(phone, message);
}
 
// 4. Payment reminder — sent automatically by the daily scheduler,
//    BEFORE the due date arrives (not tied to any admin action)
export async function sendPaymentReminderMessage(
  member: Member,
  investment: MemberInvestment,
  monthLabel: string, // e.g. "June 2026"
  dueDateStr: string, // e.g. "5 Jun 2026"
  daysLeft: number    // 0 = due today, 3 = due in 3 days
): Promise<void> {
  const phone = member.phone?.replace(/\D/g, '');
  if (!phone) return;
 
  const whenText = daysLeft === 0 ? 'today' : `in ${daysLeft} day(s)`;
 
  const message =
    `⏰ *Payment Reminder — NEFC Investment*\n\n` +
    `Dear *${member.name}*,\n\n` +
    `Your RD installment for *${monthLabel}* is due ${whenText}.\n\n` +
    `📦 *Scheme:* ${investment.schemeType.toUpperCase()} — ${investment.durationYears} Year(s)\n` +
    `💳 *Amount Due:* ${fmt(investment.amount)}\n` +
    `📅 *Due Date:* ${dueDateStr}\n\n` +
    `Please pay on time to keep your investment active.\n\n` +
    `Pay or check your account:\n` +
    `🔗 https://nefc-ten.vercel.app\n\n` +
    `_NEFC Investment Team_ 🙏`;
 
  await send(phone, message);
}
 
// ─── Init export (call once at server startup) ───────────────────────────────
export async function initWhatsApp(): Promise<void> {
  await connect();
}
 
// ─── Graceful shutdown — prevents session conflicts during redeploys ─────────
// When Railway stops the old container during a deploy, this closes the
// WhatsApp socket cleanly instead of leaving it dangling, which otherwise
// causes WhatsApp to see two active sessions at once and invalidate the login.
function shutdown() {
  console.log('🛑 Shutting down WhatsApp connection gracefully...');
  try {
    sock?.end(undefined as any);
  } catch (e) {
    // ignore errors during shutdown
  }
  process.exit(0);
}
 
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
 