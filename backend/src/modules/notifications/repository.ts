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

  async list(memberId: string): Promise<AppNotification[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(100);

    return (data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      data: r.data || {},
      read: r.read,
      created_at: r.created_at,
    }));
  }

  async markRead(memberId: string, id: string): Promise<void> {
    // Scoped to memberId too, so one member can never mark another
    // member's notification as read by guessing an id.
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('member_id', memberId);
  }

  async markAllRead(memberId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('member_id', memberId).eq('read', false);
  }
}