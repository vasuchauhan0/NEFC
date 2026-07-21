// ─── Expo Push Notification Service ───────────────────────────────────────────
// Sends push notifications to member devices via Expo's push API. No extra
// SDK/package needed — Expo's HTTP endpoint is a plain REST call, and this
// project already relies on the global `fetch` (see email.service.ts).
//
// Requires the `push_tokens` table in Supabase:
//
//   create table if not exists push_tokens (
//     id bigserial primary key,
//     member_id text not null,
//     token text not null unique,
//     device_name text,
//     created_at timestamptz not null default now()
//   );
//   create index if not exists idx_push_tokens_member on push_tokens(member_id);

import { supabase } from './db.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Expo tokens look like "ExponentPushToken[xxxxxxxx]". Anything else was
// never a real Expo token and would just be rejected by Expo's API.
function isExpoPushToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

async function sendExpoPushMessages(tokens: string[], payload: PushPayload): Promise<void> {
  const validTokens = tokens.filter(isExpoPushToken);
  if (validTokens.length === 0) return;

  const messages = validTokens.map(to => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: 'default',
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json().catch(() => null);

    // Prune tokens Expo reports as dead so we stop pushing to them.
    const tickets: any[] = result?.data || [];
    const deadTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(validTokens[i]);
      }
    });
    if (deadTokens.length > 0) {
      await supabase.from('push_tokens').delete().in('token', deadTokens);
    }
  } catch (err: any) {
    console.error('[Push] Failed to send Expo push notifications:', err.message);
  }
}

// Sends to a single member (all of their registered devices) and records
// the notification in their in-app inbox.
export async function sendPushToMember(
  memberId: string,
  payload: PushPayload
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      member_id: memberId,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      read: false,
    });

    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('member_id', memberId);

    const tokens = (tokenRows || []).map((r: any) => r.token);
    await sendExpoPushMessages(tokens, payload);
  } catch (err: any) {
    console.error('[Push] Failed to notify member:', err.message);
  }
}

// Broadcasts to every active member — used for admin announcements.
export async function sendPushToAllMembers(
  memberIds: string[],
  payload: PushPayload
): Promise<void> {
  if (memberIds.length === 0) return;

  try {
    const rows = memberIds.map(memberId => ({
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${memberId}`,
      member_id: memberId,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      read: false,
    }));
    await supabase.from('notifications').insert(rows);

    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .in('member_id', memberIds);

    const tokens = (tokenRows || []).map((r: any) => r.token);
    await sendExpoPushMessages(tokens, payload);
  } catch (err: any) {
    console.error('[Push] Failed to broadcast to members:', err.message);
  }
}