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

    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('read', true)
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