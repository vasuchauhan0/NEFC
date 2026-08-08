import { Member, MemberInvestment } from '../types/index.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  AISENSY CAMPAIGN API — sends templated messages via AiSensy's backend,
//  which sits in front of the WhatsApp Cloud API for you (no more calling
//  graph.facebook.com directly).
//
//  Env vars required (set these in Railway → your service → Variables):
//    AISENSY_API_KEY  → AiSensy dashboard → open your project → Manage page
//                        → Copy API key. This REPLACES WHATSAPP_TOKEN and
//                        WHATSAPP_PHONE_NUMBER_ID — you no longer need either.
//
//  IMPORTANT — AiSensy campaign setup: unlike raw Cloud API where you send
//  a template by its literal name, AiSensy wraps each template in an
//  "API Campaign" that you create in the dashboard and give a campaignName.
//  For EACH of the 5 templates below:
//    AiSensy → open project → Campaigns → Launch Campaign → API Campaign
//    → select the approved WhatsApp template → name the campaign
//      (recommended: reuse the same name, e.g. "welcome_member") → Set Live
//  The campaignName strings below (WELCOME, INVESTMENT_UPDATE, etc.) must
//  match EXACTLY what you typed as the Campaign Name in AiSensy — not
//  necessarily the underlying WhatsApp template name.
//
//  IMPORTANT — Meta rule (unchanged): you can only message a member first
//  (i.e. they didn't message you) using a pre-approved MESSAGE TEMPLATE.
//  Create + get ALL FIVE templates below approved in AiSensy → Manage
//  Templates BEFORE creating the API Campaigns, and keep the parameter
//  ORDER in each function exactly matching what you submitted for approval —
//  AiSensy sends params as a flat array (templateParams), and a mismatched
//  length gets the whole request rejected:
//
//  1. Name: welcome_member   (Category: Utility, Language: English (US))
//     🎉 *Welcome to NEFC Investment, {{1}}!*
//
//     Your account has been created successfully.
//
//     👤 *Member ID:* {{2}}
//     📅 *Member Since:* {{3}}
//     📍 *City:* {{4}}
//
//     Login to your account:
//     🔗 https://nefc-ten.vercel.app
//
//     For help, contact us anytime.
//     *NEFC Investment Team* 🙏
//
//  2. Name: investment_update   (Category: Utility, Language: English (US))
//     📊 *Investment Update — NEFC Investment*
//
//     Hello *{{1}}*, your investment details:
//
//     📦 *Scheme:* {{2}}
//     💰 *Monthly Deposit:* ₹{{3}}
//     📋 *Total Deposit (over term):* ₹{{4}}
//     📅 *Start Date:* {{5}}
//     🎯 *Maturity Date:* {{6}}
//     💵 *Maturity Amount:* ₹{{7}}
//     ✅ *Status:* {{8}}
//
//     View your full portfolio:
//     🔗 https://nefc-ten.vercel.app
//
//     *NEFC Investment Team* 📈
//
//  3. Name: payment_received   (Category: Utility, Language: English (US))
//     ✅ *Payment Received — NEFC Investment*
//
//     Dear *{{1}}*,
//
//     Your payment for {{2}} has been confirmed.
//
//     📦 *Scheme:* {{3}}
//     💰 *Amount:* ₹{{4}}
//     📅 *Month:* {{5}}
//
//     Thank you for staying on track! 💪
//
//     *NEFC Investment Team* 🙏
//
//     NOTE: this REPLACES the old 4-param plain-text payment_received
//     template. If you already have an approved template named
//     "payment_received" with the old body, you must either edit it in
//     WhatsApp Manager to the new body above (edits require re-approval)
//     or delete it and resubmit — the param count changed from 4 to 5.
//
//  4. Name: payment_due_reminder   (Category: Utility, Language: English (US))
//     Hi {{1}}, your {{2}} instalment of Rs. {{3}} is due on {{4}}.
//     Please make the payment on time to avoid any inconvenience.
//
//  5. Name: announcement   (Category: MARKETING — not Utility, since this is
//     a broadcast to everyone rather than a transactional receipt. Marketing
//     templates need the recipient to have opted in, and Meta reviews them
//     a bit more strictly — keep the wording generic and non-promotional
//     to reduce rejection risk.)
//     📢 *NEFC Announcement*
//
//     {{1}}
//
//     *NEFC Investment Team* 📣
// ─────────────────────────────────────────────────────────────────────────────

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

// campaignName values must match exactly what you named each API Campaign
// in the AiSensy dashboard (see the header comment above).
const CAMPAIGN = {
  WELCOME: 'welcome_member',
  INVESTMENT_UPDATE: 'investment_update',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_DUE_REMINDER: 'payment_due_reminder',
  ANNOUNCEMENT: 'announcement',
};

function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}

// Same maturity math used elsewhere in the app, so the numbers WhatsApp
// shows always match what's on the site/email.
function calculateFDMaturity(principal: number, annualRate: number, years: number) {
  const maturityAmount = Math.round(principal * Math.pow(1 + annualRate / 100, years));
  return { maturityAmount };
}

function calculateRDMaturity(monthlyDeposit: number, annualRate: number, years: number) {
  const P = monthlyDeposit;
  const i = annualRate / 100 / 12;
  const n = Math.round(years * 12);
  if (i === 0) return { totalDeposited: P * n, maturityAmount: P * n };
  const totalDeposited = P * n;
  const amount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return { totalDeposited, maturityAmount: Math.round(amount) };
}

// Normalizes a stored member phone number (which may be a plain 10-digit
// Indian number, or already carry a +91/91/0 prefix) into the "91XXXXXXXXXX"
// format the WhatsApp Cloud API expects for the "to" field.
function toWhatsAppNumber(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 13 && digits.startsWith('091')) return `91${digits.slice(3)}`;
  console.error(`[WhatsApp] Unrecognized phone number format, skipping: ${phone}`);
  return null;
}

async function sendTemplateMessage(
  toPhone: string,
  campaignName: string,
  bodyParams: string[],
  userName: string = 'Member' // AiSensy requires a userName; falls back if not passed
): Promise<void> {
  const apiKey = process.env.AISENSY_API_KEY;

  if (!apiKey) {
    console.error('[WhatsApp] Missing AISENSY_API_KEY — skipping send.');
    return;
  }

  const to = toWhatsAppNumber(toPhone);
  if (!to) return;

  try {
    const res = await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        campaignName,
        destination: `+${to}`, // AiSensy expects E.164 with a leading "+"
        userName,
        source: 'nefc-backend',
        templateParams: bodyParams,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[WhatsApp] Send failed (${res.status}) → ${to}:`, errBody);
      return;
    }

    console.log(`✅ WhatsApp sent → ${to} (${campaignName})`);
  } catch (err: any) {
    console.error('[WhatsApp] Request error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. WELCOME MESSAGE — call right after a new member record is created
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWelcomeWhatsApp(member: Member): Promise<void> {
  if (!member.phone) return;
  await sendTemplateMessage(
    member.phone,
    CAMPAIGN.WELCOME,
    [member.name, member.id, member.memberSince, member.city],
    member.name
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. INVESTMENT UPDATE — call right after a new investment/scheme is added
// ─────────────────────────────────────────────────────────────────────────────
export async function sendInvestmentUpdateWhatsApp(
  member: Member,
  investment: MemberInvestment
): Promise<void> {
  if (!member.phone) return;

  const isFD = investment.schemeType === 'fd';
  const rdCalc = calculateRDMaturity(investment.amount, investment.interestPct, investment.durationYears);
  const totalDeposit = isFD ? investment.amount : rdCalc.totalDeposited!;
  const maturityAmount = isFD
    ? calculateFDMaturity(investment.amount, investment.interestPct, investment.durationYears).maturityAmount
    : rdCalc.maturityAmount;

  await sendTemplateMessage(
    member.phone,
    CAMPAIGN.INVESTMENT_UPDATE,
    [
      member.name,
      `${investment.schemeType.toUpperCase()} — ${investment.durationYears} Year(s)`,
      fmt(investment.amount),
      fmt(totalDeposit),
      investment.startDate,
      investment.maturityDate,
      fmt(maturityAmount),
      investment.status,
    ],
    member.name
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. PAYMENT RECEIVED — call when admin marks a month's instalment as paid
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPaymentReceivedWhatsApp(
  member: Member,
  investment: MemberInvestment,
  month: string // e.g. "June 2026"
): Promise<void> {
  if (!member.phone) return;
  await sendTemplateMessage(
    member.phone,
    CAMPAIGN.PAYMENT_RECEIVED,
    [member.name, month, investment.schemeType.toUpperCase(), fmt(investment.amount), month],
    member.name
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. PAYMENT DUE REMINDER — call from paymentReminderScheduler.ts
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPaymentDueReminderWhatsApp(
  member: Member,
  investment: MemberInvestment,
  dueDateLabel: string // e.g. "8 Aug 2026"
): Promise<void> {
  if (!member.phone) return;
  await sendTemplateMessage(
    member.phone,
    CAMPAIGN.PAYMENT_DUE_REMINDER,
    [member.name, investment.schemeType.toUpperCase(), fmt(investment.amount), dueDateLabel],
    member.name
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. ANNOUNCEMENT BROADCAST — call from announcements/service.ts whenever an
//     admin sets/updates the site-wide announcement. Sends to every member
//     passed in (filter to Active members before calling this).
//     Sent in parallel with Promise.allSettled so one bad phone number
//     doesn't block the rest of the broadcast.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncementWhatsApp(
  members: Member[],
  text: string
): Promise<void> {
  const recipients = members.filter(m => m.phone);
  if (recipients.length === 0) return;

  const results = await Promise.allSettled(
    recipients.map(m => sendTemplateMessage(m.phone, CAMPAIGN.ANNOUNCEMENT, [text], m.name))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.error(`[WhatsApp] Announcement broadcast: ${failed}/${recipients.length} sends failed.`);
  }
}