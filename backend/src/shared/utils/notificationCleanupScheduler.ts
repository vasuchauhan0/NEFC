import cron from 'node-cron';
import { supabase } from './db.ts';

// Keeps the `notifications` table from growing forever. Removes ANY
// notification older than the retention window, read or unread — after 7
// days a notification is simply gone from everyone's inbox.
const RETENTION_DAYS = 7;

async function runNotificationCleanup(): Promise<void> {
  console.log(`🧹 [Notification Cleanup] Removing notifications older than ${RETENTION_DAYS} days...`);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // Age alone decides removal now — no `read` filter. This covers both
    // personal notifications and broadcast announcements (member_id IS
    // NULL); any `notification_reads` rows for a deleted broadcast are
    // removed automatically via ON DELETE CASCADE.
    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString());

    if (error) {
      console.error('❌ [Notification Cleanup] Error:', error.message);
      return;
    }

    console.log(`✅ [Notification Cleanup] Done. Removed ${count ?? 0} old notification(s).`);
  } catch (err: any) {
    console.error('❌ [Notification Cleanup] Error:', err.message);
  }
}

export function startNotificationCleanupScheduler(): void {
  cron.schedule('0 3 * * *', runNotificationCleanup);
  console.log('📅 Notification cleanup scheduler active: daily at 3:00 AM');
}

export { runNotificationCleanup };