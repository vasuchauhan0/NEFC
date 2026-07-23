import { supabase } from '../../shared/utils/db.ts';
import { AppNotification } from '../../shared/types/index.ts';

export class NotificationsRepository {
  async registerToken(memberId: string, token: string, deviceName?: string): Promise<void> {
    // Upsert on token: a device may re-register (e.g. after logout/login as
    // the same or a different member), so token is unique and always wins.
    await supabase.from('push_tokens').upsert(
      { member_id: memberId, token, device_name: deviceName || null },
      { onConflict: 'token' }
    );
  }

  async unregisterToken(token: string): Promise<void> {
    await supabase.from('push_tokens').delete().eq('token', token);
  }

  // A member's inbox is the union of:
  //  - their own personal rows (member_id = memberId), where `read` lives
  //    directly on the row, and
  //  - broadcast rows (member_id IS NULL, e.g. admin announcements), which
  //    are shared by every member and whose read state per-member lives in
  //    the separate `notification_reads` table instead of on the row.
  async list(memberId: string): Promise<AppNotification[]> {
    const [{ data: personal }, { data: broadcasts }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('notifications')
        .select('*')
        .is('member_id', null)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const broadcastList = broadcasts || [];
    let readIds = new Set<string>();

    if (broadcastList.length > 0) {
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('member_id', memberId)
        .in('notification_id', broadcastList.map((b: any) => b.id));

      readIds = new Set((reads || []).map((r: any) => r.notification_id));
    }

    const merged = [
      ...(personal || []),
      ...broadcastList.map((r: any) => ({ ...r, read: readIds.has(r.id) })),
    ];

    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return merged.slice(0, 100).map((r: any) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      data: r.data || {},
      read: r.read,
      created_at: r.created_at,
    }));
  }

  async markRead(memberId: string, id: string): Promise<void> {
    const { data: notif } = await supabase
      .from('notifications')
      .select('id, member_id')
      .eq('id', id)
      .maybeSingle();

    if (!notif) return;

    if (notif.member_id === null) {
      // Broadcast row: record this member's own read receipt rather than
      // mutating the shared row (that would mark it read for everyone).
      await supabase
        .from('notification_reads')
        .upsert(
          { notification_id: id, member_id: memberId },
          { onConflict: 'notification_id,member_id' }
        );
    } else if (notif.member_id === memberId) {
      // Scoped to memberId too, so one member can never mark another
      // member's notification as read by guessing an id.
      await supabase.from('notifications').update({ read: true }).eq('id', id).eq('member_id', memberId);
    }
  }

  async markAllRead(memberId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('member_id', memberId).eq('read', false);

    // Also record read receipts for any broadcast announcements this
    // member hasn't acknowledged yet.
    const { data: broadcasts } = await supabase
      .from('notifications')
      .select('id')
      .is('member_id', null)
      .limit(100);

    if (broadcasts && broadcasts.length > 0) {
      const rows = broadcasts.map((b: any) => ({ notification_id: b.id, member_id: memberId }));
      await supabase
        .from('notification_reads')
        .upsert(rows, { onConflict: 'notification_id,member_id' });
    }
  }
}