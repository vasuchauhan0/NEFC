import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SiteData, Member, MemberInvestment, InvestmentScheme, ContactMessage } from '../types/index.ts';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

export const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const jsonPath = path.join(process.cwd(), 'backend/src/data_store.json');

const supabase = useSupabase
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  : null as any;

export { supabase };

const settingKeys = ['adminPass', 'company', 'hero', 'announcement', 'stats', 'steps', 'trust'] as const;

// ─── Helper: load all site_settings ──────────────────────────────────────────
async function getSettings(): Promise<Omit<SiteData, 'schemes' | 'members' | 'messages'>> {
  const { data } = await supabase.from('site_settings').select('key, value');
  const map: Record<string, any> = {};
  for (const row of data || []) map[row.key] = row.value;

  return {
    adminPass:    map['adminPass']    ?? 'admin123',
    company:      map['company']      ?? {},
    hero:         map['hero']         ?? {},
    announcement: map['announcement'] ?? '',
    stats:        map['stats']        ?? [],
    steps:        map['steps']        ?? [],
    trust:        map['trust']        ?? [],
  };
}

// ─── getDatabase ──────────────────────────────────────────────────────────────
export async function getDatabase(): Promise<SiteData> {
  if (!useSupabase) {
    try {
      const raw = await fs.promises.readFile(jsonPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read local fallback DB, returning base stubs:', err);
      return {
        adminPass: 'admin123',
        company: {} as any,
        hero: {} as any,
        announcement: '',
        stats: [],
        steps: [],
        trust: [],
        schemes: [],
        members: [],
        messages: [],
      };
    }
  }

  const [settings, schemesRes, membersRes, messagesRes, investmentsRes] = await Promise.all([
    getSettings(),
    supabase.from('schemes').select('*'),
    supabase.from('members').select('*'),
    supabase.from('contact_messages').select('*'),
    supabase.from('member_investments').select('*'),
  ]);

  const schemes: InvestmentScheme[] = (schemesRes.data || []).map((r: any) => ({
    id: r.id,
    type: r.type,
    durationYears: r.duration_years,
    interestPct: r.interest_pct,
    maturityAmountPreview: r.maturity_amount_preview,
    status: r.status,
  }));

  const members: Member[] = (membersRes.data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    city: r.city,
    password: r.password,
    status: r.status,
    memberSince: r.member_since,
    fatherName: r.father_name ?? undefined,
    aadharNumber: r.aadhar_number ?? undefined,
    panNumber: r.pan_number ?? undefined,
    nomineeName: r.nominee_name ?? undefined,
    nomineeRelation: r.nominee_relation ?? undefined,
    investments: (investmentsRes.data || [])
      .filter((i: any) => i.member_id === r.id)
      .map((i: any) => ({
        id: i.id,
        schemeId: i.scheme_id,
        schemeType: i.scheme_type,
        amount: i.amount,
        interestPct: i.interest_pct,
        durationYears: i.duration_years,
        startDate: i.start_date,
        maturityDate: i.maturity_date,
        status: i.status,
        paidMonths: i.paid_months ?? [],
      })),
  }));

  const messages: ContactMessage[] = (messagesRes.data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    subject: r.subject,
    message: r.message,
    date: r.date,
    read: r.read,
  }));

  return { ...settings, schemes, members, messages };
}

// ─── saveDatabase ─────────────────────────────────────────────────────────────
// NOTE: This function only upserts settings, schemes, members, and investments.
// It does NOT delete anything. Deletions must be done explicitly via the
// direct helper functions below. This prevents race conditions where a
// stale in-memory snapshot accidentally deletes records added by other requests.
export async function saveDatabase(data: SiteData): Promise<void> {
  if (!useSupabase) {
    await fs.promises.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    return;
  }

  // Upsert settings
  try {
    const { error } = await supabase.from('site_settings').upsert(
      settingKeys.map(key => ({ key, value: data[key] }))
    );
    if (error) console.error('[SUPABASE SAVE ERROR] site_settings upsert error:', error);
  } catch (err) {
    console.error('[SUPABASE SAVE ERROR] Failed to upsert site_settings:', err);
  }

  // Upsert schemes — skip if empty to prevent accidental wipe from stale snapshots
  if (data.schemes && data.schemes.length > 0) {
    try {
      const { error } = await supabase.from('schemes').upsert(
        data.schemes.map((s: any) => ({
          id: s.id,
          type: s.type,
          duration_years: s.durationYears,
          interest_pct: s.interestPct,
          maturity_amount_preview: s.maturityAmountPreview,
          status: s.status,
        }))
      );
      if (error) console.error('[SUPABASE SAVE ERROR] schemes upsert error:', error);
    } catch (err) {
      console.error('[SUPABASE SAVE ERROR] Failed to upsert schemes:', err);
    }
  }

  // Upsert members
  if (data.members && data.members.length > 0) {
    try {
      const { error } = await supabase.from('members').upsert(
        data.members.map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          city: m.city,
          password: m.password,
          status: m.status,
          member_since: m.memberSince,
          father_name: m.fatherName ?? null,
          aadhar_number: m.aadharNumber ?? null,
          pan_number: m.panNumber ?? null,
          nominee_name: m.nomineeName ?? null,
          nominee_relation: m.nomineeRelation ?? null,
        }))
      );
      if (error) console.error('[SUPABASE SAVE ERROR] members upsert error:', error);
    } catch (err) {
      console.error('[SUPABASE SAVE ERROR] Failed to upsert members:', err);
    }
  }

  // Upsert investments
  try {
    const allInvestments = (data.members || []).flatMap((m: any) =>
      (m.investments || []).map((i: any) => ({
        id: i.id,
        member_id: m.id,
        scheme_id: i.schemeId,
        scheme_type: i.schemeType,
        amount: i.amount,
        interest_pct: i.interestPct,
        duration_years: i.durationYears,
        start_date: i.startDate,
        maturity_date: i.maturityDate,
        status: i.status,
        paid_months: i.paidMonths ?? [],
      }))
    );

    if (allInvestments.length > 0) {
      const { error } = await supabase.from('member_investments').upsert(allInvestments);
      if (error) console.error('[SUPABASE SAVE ERROR] member_investments upsert error:', error);
    }
  } catch (err) {
    console.error('[SUPABASE SAVE ERROR] Failed to upsert member_investments:', err);
  }

  // Upsert messages
  if (data.messages && data.messages.length > 0) {
    try {
      const { error } = await supabase.from('contact_messages').upsert(
        data.messages.map((msg: any) => ({
          id: msg.id,
          name: msg.name,
          contact: msg.contact,
          subject: msg.subject,
          message: msg.message,
          date: msg.date,
          read: msg.read,
        }))
      );
      if (error) console.error('[SUPABASE SAVE ERROR] contact_messages upsert error:', error);
    } catch (err) {
      console.error('[SUPABASE SAVE ERROR] Failed to upsert contact_messages:', err);
    }
  }
}

// ─── Direct delete helpers (use these instead of snapshot-based deletes) ─────

export async function deleteMemberById(id: string): Promise<void> {
  if (!useSupabase) {
    const db = await getDatabase();
    db.members = db.members.filter(m => m.id !== id);
    await saveDatabase(db);
    return;
  }
  await supabase.from('member_investments').delete().eq('member_id', id);
  await supabase.from('members').delete().eq('id', id);
}

export async function deleteSchemeById(id: string): Promise<void> {
  if (!useSupabase) {
    const db = await getDatabase();
    db.schemes = db.schemes.filter(s => s.id !== id);
    await saveDatabase(db);
    return;
  }
  await supabase.from('schemes').delete().eq('id', id);
}

export async function deleteInvestmentById(investmentId: string): Promise<void> {
  if (!useSupabase) {
    const db = await getDatabase();
    db.members.forEach(m => {
      if (m.investments) {
        m.investments = m.investments.filter(i => i.id !== investmentId);
      }
    });
    await saveDatabase(db);
    return;
  }
  await supabase.from('member_investments').delete().eq('id', investmentId);
}

export async function deleteMessageById(id: string): Promise<void> {
  if (!useSupabase) {
    const db = await getDatabase();
    db.messages = db.messages.filter(m => m.id !== id);
    await saveDatabase(db);
    return;
  }
  await supabase.from('contact_messages').delete().eq('id', id);
}

// ─── getDatabasePath (legacy compat) ─────────────────────────────────────────
export async function getDatabasePath(): Promise<string> {
  return useSupabase ? 'supabase' : 'local-json';
}

// ─── Admin Token Storage ──────────────────────────────────────────────────────
const localAdminTokens = new Set<string>();

export async function saveAdminToken(token: string): Promise<void> {
  if (!useSupabase) {
    localAdminTokens.add(token);
    return;
  }
  const now = new Date().toISOString();
  const expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await supabase.from('admin_tokens').delete().lt('expires_at', now);
  await supabase.from('admin_tokens').insert({ token, expires_at });
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!useSupabase) {
    return localAdminTokens.has(token);
  }
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
  if (!useSupabase) {
    localAdminTokens.delete(token);
    return;
  }
  await supabase.from('admin_tokens').delete().eq('token', token);
}