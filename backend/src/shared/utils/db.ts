import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SiteData, Member, MemberInvestment, InvestmentScheme, ContactMessage } from '../types';
import { WebSocket } from 'ws';

if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

export const useSupabase = true;

// ─── Lazy Supabase client ─────────────────────────────────────────────────────
// Single factory function used by both Proxy traps — no duplicated init code.

let _supabase: any = null;

function getClient() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({} as any, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(getClient(), prop, value, receiver);
  },
});

// ─── Row mappers (single source of truth for DB ↔ app shape) ─────────────────

export function rowToInvestment(i: any): MemberInvestment {
  return {
    id:            i.id,
    schemeId:      i.scheme_id,
    schemeType:    i.scheme_type,
    amount:        i.amount,
    interestPct:   i.interest_pct,
    durationYears: i.duration_years,
    startDate:     i.start_date,
    maturityDate:  i.maturity_date,
    status:        i.status,
    paidMonths:    i.paid_months ?? [],
  };
}

export function rowToMember(r: any, investments: any[]): Member {
  return {
    id:              r.id,
    name:            r.name,
    email:           r.email,
    phone:           r.phone,
    city:            r.city,
    password:        r.password,
    status:          r.status,
    memberSince:     r.member_since,
    fatherName:      r.father_name      ?? undefined,
    aadharNumber:    r.aadhar_number    ?? undefined,
    panNumber:       r.pan_number       ?? undefined,
    nomineeName:     r.nominee_name     ?? undefined,
    nomineeRelation: r.nominee_relation ?? undefined,
    investments: investments
      .filter(i => i.member_id === r.id)
      .map(rowToInvestment),
  };
}

export function rowToScheme(r: any): InvestmentScheme {
  return {
    id:                    r.id,
    type:                  r.type,
    durationYears:         r.duration_years,
    interestPct:           r.interest_pct,
    maturityAmountPreview: r.maturity_amount_preview,
    status:                r.status,
  };
}

export function rowToMessage(r: any): ContactMessage {
  return {
    id:      r.id,
    name:    r.name,
    contact: r.contact,
    subject: r.subject ?? '',   // normalize null → ''
    message: r.message,
    date:    r.date,
    read:    r.read,
  };
}

// ─── getDatabase ──────────────────────────────────────────────────────────────
// Full fetch — used only by admin endpoints that genuinely need all tables.
// All other repositories query only the table they need (see each repo file).

export async function getDatabase(): Promise<SiteData> {
  const [settingsRes, schemesRes, membersRes, messagesRes, investmentsRes] = await Promise.all([
    supabase.from('site_settings').select('key, value'),
    supabase.from('schemes').select('*'),
    supabase.from('members').select('*'),
    supabase.from('contact_messages').select('*'),
    supabase.from('member_investments').select('*'),
  ]);

  const map: Record<string, any> = {};
  for (const row of settingsRes.data || []) map[row.key] = row.value;

  return {
    adminPass:           map['adminPass']           ?? 'admin123',
    company:             map['company']             ?? {},
    hero:                map['hero']                ?? {},
    announcement:        map['announcement']        ?? '',
    stats:               map['stats']               ?? [],
    steps:               map['steps']               ?? [],
    trust:               map['trust']               ?? [],
    adminFailedAttempts: map['adminFailedAttempts'] ?? 0,
    adminLockoutUntil:   map['adminLockoutUntil']   ?? 0,
    schemes:   (schemesRes.data     || []).map(rowToScheme),
    members:   (membersRes.data     || []).map((r: any) => rowToMember(r, investmentsRes.data || [])),
    messages:  (messagesRes.data    || []).map(rowToMessage),
  };
}

// ─── saveDatabase ─────────────────────────────────────────────────────────────
// Saves ONLY site_settings (config + lockout state).
// Members / investments / schemes / messages are written by their own repos.
// This eliminates the old O(N) full-table bulk re-upsert on every admin action.

const settingKeys = [
  'adminPass', 'company', 'hero', 'announcement', 'stats', 'steps', 'trust',
] as const;

export async function saveDatabase(data: Partial<SiteData>): Promise<void> {
  const rows: { key: string; value: any }[] = settingKeys
    .filter(key => key in data)
    .map(key => ({ key, value: (data as any)[key] }));

  if ((data as any).adminFailedAttempts !== undefined)
    rows.push({ key: 'adminFailedAttempts', value: (data as any).adminFailedAttempts });
  if ((data as any).adminLockoutUntil !== undefined)
    rows.push({ key: 'adminLockoutUntil', value: (data as any).adminLockoutUntil });

  if (rows.length === 0) return;

  try {
    const { error } = await supabase.from('site_settings').upsert(rows);
    if (error) console.error('[DB] site_settings upsert error:', error);
  } catch (err) {
    console.error('[DB] Failed to upsert site_settings:', err);
  }
}

// ─── Direct delete helpers ────────────────────────────────────────────────────

export async function deleteMemberById(id: string): Promise<void> {
  // investments first to avoid FK violations
  await supabase.from('member_investments').delete().eq('member_id', id);
  await supabase.from('members').delete().eq('id', id);
}

export async function deleteSchemeById(id: string): Promise<void> {
  await supabase.from('schemes').delete().eq('id', id);
}

export async function deleteInvestmentById(investmentId: string): Promise<void> {
  await supabase.from('member_investments').delete().eq('id', investmentId);
}

export async function deleteMessageById(id: string): Promise<void> {
  await supabase.from('contact_messages').delete().eq('id', id);
}

// ─── getDatabasePath (legacy compat) ─────────────────────────────────────────

export async function getDatabasePath(): Promise<string> {
  return 'supabase';
}

// ─── Admin Token Storage ──────────────────────────────────────────────────────

export async function saveAdminToken(token: string): Promise<void> {
  const now = new Date();
const expiry = new Date();
expiry.setHours(1, 0, 0, 0); // 1:00:00 AM
if (expiry <= now) {
  expiry.setDate(expiry.getDate() + 1); // if already past 1 AM, set to next day 1 AM
}
const expires_at = expiry.toISOString();
  // Cleanup expired tokens and insert new one in parallel
  await Promise.all([
    supabase.from('admin_tokens').delete().lt('expires_at', now),
    supabase.from('admin_tokens').insert({ token, expires_at }),
  ]);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('admin_tokens')
    .select('token')
    .eq('token', token)
    .gt('expires_at', now)
    .single();
  return !!data;
}

export async function deleteAdminToken(token: string): Promise<void> {
  await supabase.from('admin_tokens').delete().eq('token', token);
}
