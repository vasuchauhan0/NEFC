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
//  didn't message you) using a pre-approved MESSAGE TEMPLATE. Free-form text
//  is rejected outside a 24h customer-service window. Create + get these two
//  templates approved first in WhatsApp Manager → Manage templates:
//
//    1. Name: payment_received   (Category: Utility, Language: English (US))
//       Body: Hi {{1}}, we've received your payment of Rs. {{2}} for your
//             {{3}} instalment ({{4}}). Thank you for your continued trust
//             in NEFC.
//
//    2. Name: payment_due_reminder   (Category: Utility, Language: English (US))
//       Body: Hi {{1}}, your {{2}} instalment of Rs. {{3}} is due on {{4}}.
//             Please make the payment on time to avoid any inconvenience.
//
//  The template names below and the ORDER of parameters must exactly match
//  what you submit for approval. If you reword a template in WhatsApp
//  Manager, update the matching function below to keep params in sync.
// ─────────────────────────────────────────────────────────────────────────────

const GRAPH_API_VERSION = 'v22.0';

function fmt(n: number): string {
  return n.toLocaleString('en-IN');
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
  bodyParams: string[]
): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('[WhatsApp] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID — skipping send.');
    return;
  }

  const to = toWhatsAppNumber(toPhone);
  if (!to) return;

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
            components: [
              {
                type: 'body',
                parameters: bodyParams.map(text => ({ type: 'text', text })),
              },
            ],
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
//  1. PAYMENT RECEIVED — call when admin marks a month's instalment as paid
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPaymentReceivedWhatsApp(
  member: Member,
  investment: MemberInvestment,
  month: string // e.g. "June 2026"
): Promise<void> {
  if (!member.phone) return;
  await sendTemplateMessage(member.phone, 'payment_received', [
    member.name,
    fmt(investment.amount),
    investment.schemeType.toUpperCase(),
    month,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. PAYMENT DUE REMINDER — call from paymentReminderScheduler.ts
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