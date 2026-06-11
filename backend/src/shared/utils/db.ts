import { createClient } from '@supabase/supabase-js';
import { SiteData, Member, MemberInvestment, InvestmentScheme, ContactMessage } from '../types/index.ts';
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
export async function saveDatabase(data: SiteData): Promise<void> {

  // Upsert settings
  await supabase.from('site_settings').upsert(
    settingKeys.map(key => ({ key, value: data[key] }))
  );

  // Upsert schemes
  await supabase.from('schemes').upsert(
    data.schemes.map((s: any) => ({
      id: s.id,
      type: s.type,
      duration_years: s.durationYears,
      interest_pct: s.interestPct,
      maturity_amount_preview: s.maturityAmountPreview,
      status: s.status,
    }))
  );

  // Delete removed schemes
  const schemeIds = data.schemes.map((s: any) => s.id);
  if (schemeIds.length > 0) {
    await supabase.from('schemes').delete().not('id', 'in', `(${schemeIds.map((id: string) => `"${id}"`).join(',')})`);
  } else {
    await supabase.from('schemes').delete().neq('id', '');
  }

  // Upsert members
  await supabase.from('members').upsert(
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

  // Delete removed members
  const memberIds = data.members.map((m: any) => m.id);
  if (memberIds.length > 0) {
    await supabase.from('members').delete().not('id', 'in', `(${memberIds.map((id: string) => `"${id}"`).join(',')})`);
  } else {
    await supabase.from('members').delete().neq('id', '');
  }

  // Upsert investments
  const allInvestments = data.members.flatMap((m: any) =>
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

  // Delete removed investments
  const investmentIds = allInvestments.map((i: any) => i.id);
  if (investmentIds.length > 0) {
    await supabase.from('member_investments').delete().not('id', 'in', `(${investmentIds.map((id: string) => `"${id}"`).join(',')})`);
  } else {
    await supabase.from('member_investments').delete().neq('id', '');
  }

  if (allInvestments.length > 0) {
    await supabase.from('member_investments').upsert(allInvestments);
  }

  // Upsert messages
  if (data.messages.length > 0) {
    await supabase.from('contact_messages').upsert(
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
  }

  // Delete removed messages
  const messageIds = data.messages.map((m: any) => m.id);
  if (messageIds.length > 0) {
    await supabase.from('contact_messages').delete().not('id', 'in', `(${messageIds.map((id: string) => `"${id}"`).join(',')})`);
  } else {
    await supabase.from('contact_messages').delete().neq('id', '');
  }
}

// ─── getDatabasePath (legacy compat) ─────────────────────────────────────────
export async function getDatabasePath(): Promise<string> {
  return 'supabase';
}

// ─── Admin Token Storage ──────────────────────────────────────────────────────
export async function saveAdminToken(token: string): Promise<void> {
  const now = new Date().toISOString();
  const expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await supabase.from('admin_tokens').delete().lt('expires_at', now);
  await supabase.from('admin_tokens').insert({ token, expires_at });
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