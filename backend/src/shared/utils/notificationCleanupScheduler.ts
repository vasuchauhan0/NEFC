import cron from 'node-cron';
import { supabase } from './db.ts';

// Keeps the `notifications` table from growing forever. Only removes
// notifications that are BOTH read AND older than the retention window —
// unread notifications are never touched, no matter how old, so a member
// can never lose something they haven't seen yet.
const RETENTION_DAYS = 90;

async function runNotificationCleanup(): Promise<void> {
  console.log(`🧹 [Notification Cleanup] Removing read notifications older than ${RETENTION_DAYS} days...`);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // Personal, member-scoped notifications: only clean up once read.
    const { error: personalError, count: personalCount } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('read', true)
      .not('member_id', 'is', null)
      .lt('created_at', cutoff.toISOString());

    if (personalError) {
      console.error('❌ [Notification Cleanup] Error (personal):', personalError.message);
    }

    // Broadcast announcements (member_id IS NULL) track read state
    // per-member in `notification_reads`, not on the row itself, so age
    // alone decides when they're removed. `notification_reads` rows for
    // them are cleaned up automatically via ON DELETE CASCADE.
    const { error: broadcastError, count: broadcastCount } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .is('member_id', null)
      .lt('created_at', cutoff.toISOString());

    if (broadcastError) {
      console.error('❌ [Notification Cleanup] Error (broadcast):', broadcastError.message);
      return;
    }

    console.log(`✅ [Notification Cleanup] Done. Removed ${(personalCount ?? 0) + (broadcastCount ?? 0)} old notification(s).`);
  } catch (err: any) {
    console.error('❌ [Notification Cleanup] Error:', err.message);
  }
}

export function startNotificationCleanupScheduler(): void {
  cron.schedule('0 3 * * *', runNotificationCleanup);
  console.log('📅 Notification cleanup scheduler active: daily at 3:00 AM');
}

export { runNotificationCleanup };