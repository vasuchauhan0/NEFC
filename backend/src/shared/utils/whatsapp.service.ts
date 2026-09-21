import { Member, MemberInvestment } from '../types/index.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  WHATSAPP CLOUD API — sends templated messages via Meta's Graph API.
//  Env vars required (set these in Railway → your service → Variables):
//    WHATSAPP_TOKEN            → a PERMANENT token (create a System User in
//                                Meta Business Settings → System Users →
//                                generate token with whatsapp_business_messaging
//                                + whatsapp_business_management permissions).
//                                Do NOT use the 24-hour temporary token shown
//                                on the "API Setup" dev console page — it
//                                expires and the scheduler will silently stop
//                                sending once it does.
//    WHATSAPP_PHONE_NUMBER_ID  → the Phone Number ID from WhatsApp Manager
//                                (e.g. 1188884857647084) — NOT the phone
//                                number itself.
//
//  IMPORTANT — Meta rule: you can only message a member first (i.e. they
//  didn't message you) using a pre-approved MESSAGE TEMPLATE. Create + get
//  ALL FIVE templates below approved in WhatsApp Manager → Manage templates
//  BEFORE deploying this file, and keep the parameter ORDER in each function
//  exactly matching what you submit for approval:
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
//
//  6. Name: announcement_image   (Category: MARKETING, Language: English (US))
//     Header type: IMAGE (when submitting for approval, Meta asks you to
//     attach a SAMPLE image — any placeholder image works, the real image is
//     swapped in per-send via the "link" you pass at send time).
//     Body:
//     📢 *NEFC Announcement*
//
//     *NEFC Investment Team* 📣
//     (No body variables — this template is image-only, so there is nothing
//     for the admin to type per-send besides picking/uploading the image.)
//
//  7. Name: announcement_image_text   (Category: MARKETING, Language: English (US))
//     Header type: IMAGE (same as above — attach any sample image on submission).
//     Body:
//     📢 *NEFC Announcement*
//
//     {{1}}
//
//     *NEFC Investment Team* 📣
//     (One body variable — the admin's typed announcement text goes here,
//     the image goes in the header.)
// ─────────────────────────────────────────────────────────────────────────────

const GRAPH_API_VERSION = 'v22.0';

function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}

// WhatsApp template BODY parameters cannot contain newline/tab characters
// or more than 4 consecutive spaces (Meta error #132018: "Param text
// cannot have new-line/tab characters or more than 4 consecutive spaces").
// This mainly bites free-typed admin text (announcements) — copy-pasted
// text often carries hidden line breaks or tabs — but it's applied to
// every param here as cheap insurance since it's a no-op on clean text.
function sanitizeParam(text: string): string {
  return (text ?? '')
    .toString()
    .replace(/[\r\n\t]+/g, ' ') // newlines/tabs → single space
    .replace(/ {2,}/g, ' ')     // collapse runs of 2+ spaces to 1
    .trim();
}

function sanitizeParams(params: string[]): string[] {
  return params.map(sanitizeParam);
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
  templateName: string,
  bodyParams: string[],
  imageLink?: string
): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('[WhatsApp] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID — skipping send.');
    return;
  }

  const to = toWhatsAppNumber(toPhone);
  if (!to) return;

  // Sanitize every body param here too (belt-and-braces, in case a caller
  // is ever added later that forgets to sanitize before calling this).
  const safeParams = sanitizeParams(bodyParams);

  // Build components: an IMAGE header (when a link is supplied) and/or a
  // BODY with text parameters (when the template has variables). A template
  // like "announcement_image" has no body variables, so bodyParams is empty
  // and only the header component is sent.
  const components: Record<string, unknown>[] = [];
  if (imageLink) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: imageLink } }],
    });
  }
  if (safeParams.length > 0) {
    components.push({
      type: 'body',
      parameters: safeParams.map(text => ({ type: 'text', text })),
    });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components,
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[WhatsApp] Send failed (${res.status}) → ${to}:`, errBody);
      return;
    }

    console.log(`✅ WhatsApp sent → ${to} (${templateName})`);
  } catch (err: any) {
    console.error('[WhatsApp] Request error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. WELCOME MESSAGE — call right after a new member record is created
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWelcomeWhatsApp(member: Member): Promise<void> {
  if (!member.phone) return;
  await sendTemplateMessage(member.phone, 'welcome_member', [
    member.name,
    member.id,
    member.memberSince,
    member.city,
  ]);
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

  await sendTemplateMessage(member.phone, 'investment_update', [
    member.name,
    `${investment.schemeType.toUpperCase()} — ${investment.durationYears} Year(s)`,
    fmt(investment.amount),
    fmt(totalDeposit),
    investment.startDate,
    investment.maturityDate,
    fmt(maturityAmount),
    investment.status,
  ]);
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
  await sendTemplateMessage(member.phone, 'payment_received', [
    member.name,
    month,
    investment.schemeType.toUpperCase(),
    fmt(investment.amount),
    month,
  ]);
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
  await sendTemplateMessage(member.phone, 'payment_due_reminder', [
    member.name,
    investment.schemeType.toUpperCase(),
    fmt(investment.amount),
    dueDateLabel,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. ANNOUNCEMENT BROADCAST — call from announcements/service.ts whenever an
//     admin sets/updates the site-wide announcement. Sends to every member
//     passed in (filter to Active members before calling this).
//     Sent in parallel with Promise.allSettled so one bad phone number
//     doesn't block the rest of the broadcast.
//
//     `text` is free-typed by the admin (often copy-pasted), so it's the
//     most likely source of the #132018 "new-line/tab or 4+ spaces" error —
//     sanitized here before it's used for every recipient.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncementWhatsApp(
  members: Member[],
  text: string
): Promise<void> {
  const recipients = members.filter(m => m.phone);
  if (recipients.length === 0) return;

  const safeText = sanitizeParam(text);

  const results = await Promise.allSettled(
    recipients.map(m => sendTemplateMessage(m.phone, 'announcement', [safeText]))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.error(`[WhatsApp] Announcement broadcast: ${failed}/${recipients.length} sends failed.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. ANNOUNCEMENT BROADCAST TO RAW NUMBERS — same "announcement" template as
//     above, but for arbitrary phone numbers the admin types in by hand
//     (prospects / non-members), instead of pulling from the members table.
//     Called from announcements/service.ts when the admin supplies an
//     `extraPhones` list alongside (or instead of) the member broadcast.
//     NOTE: these numbers have not necessarily opted in — Meta's Marketing
//     template rules technically require opt-in, so heavy use on cold numbers
//     can hurt the WhatsApp Business Account's quality rating over time.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncementWhatsAppToNumbers(
  phones: string[],
  text: string
): Promise<void> {
  const recipients = Array.from(new Set((phones || []).map(p => (p || '').trim()).filter(Boolean)));
  if (recipients.length === 0) return;

  const safeText = sanitizeParam(text);

  const results = await Promise.allSettled(
    recipients.map(phone => sendTemplateMessage(phone, 'announcement', [safeText]))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.error(`[WhatsApp] Announcement (custom numbers) broadcast: ${failed}/${recipients.length} sends failed.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. ANNOUNCEMENT BROADCAST — IMAGE ONLY — uses the "announcement_image"
//     template (header: image, no body variables). `imageUrl` must be a
//     public HTTPS link (Meta fetches it directly) — a signed/private URL
//     or localhost link will fail silently on Meta's side.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncementImageWhatsApp(
  phones: string[],
  imageUrl: string
): Promise<void> {
  const recipients = Array.from(new Set((phones || []).map(p => (p || '').trim()).filter(Boolean)));
  if (recipients.length === 0 || !imageUrl) return;

  const results = await Promise.allSettled(
    recipients.map(phone => sendTemplateMessage(phone, 'announcement_image', [], imageUrl))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.error(`[WhatsApp] Announcement (image) broadcast: ${failed}/${recipients.length} sends failed.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  8. ANNOUNCEMENT BROADCAST — IMAGE + TEXT — uses the "announcement_image_text"
//     template (header: image, body: {{1}} = the admin's typed text).
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncementImageTextWhatsApp(
  phones: string[],
  imageUrl: string,
  text: string
): Promise<void> {
  const recipients = Array.from(new Set((phones || []).map(p => (p || '').trim()).filter(Boolean)));
  if (recipients.length === 0 || !imageUrl) return;

  const safeText = sanitizeParam(text);

  const results = await Promise.allSettled(
    recipients.map(phone => sendTemplateMessage(phone, 'announcement_image_text', [safeText], imageUrl))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.error(`[WhatsApp] Announcement (image+text) broadcast: ${failed}/${recipients.length} sends failed.`);
  }
}