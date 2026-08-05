import cron from 'node-cron';
import { MemberService } from '../../modules/members/service.ts';
import { sendPushToMember } from './push.service.ts';
import { sendPaymentDueReminderWhatsApp } from './whatsapp.service.ts';
 
const service = new MemberService();
 
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
 
// Same date-comparison approach as AdminPortal's "Due Instalments" tab:
// strip time so we compare calendar days only.
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
 
function formatDueDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
 
async function runReminderCheck(): Promise<void> {
  console.log('⏰ [Reminder Job] Checking RD instalments due in 3 days / today...');
 
  try {
    const members = await service.getAllMembers();
    const today = startOfDay(new Date());
 
    let remindersSent = 0;
 
    for (const member of members) {
      if (member.status !== 'Active' || !member.phone) continue;
 
      for (const inv of member.investments || []) {
        if (inv.schemeType !== 'rd' || inv.status !== 'Active') continue;
 
        const start = new Date(inv.startDate);
        const dueDay = start.getDate();
 
        // This month's due date for this investment
        const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
        const monthKey = `${dueDateThisMonth.getFullYear()}-${pad2(dueDateThisMonth.getMonth() + 1)}`;
        const monthLabel = dueDateThisMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
 
        const paidMonths = inv.paidMonths || [];
        if (paidMonths.includes(monthKey)) continue; // already paid, skip
 
        const diffDays = Math.round(
          (startOfDay(dueDateThisMonth).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
 
        // Only fire on exactly 3 days before, or exactly on the due day
        if (diffDays === 3 || diffDays === 0) {
          sendPushToMember(member.id, {
            title: diffDays === 0 ? 'Instalment Due Today' : 'Instalment Due Soon',
            body: `Your ${inv.schemeType.toUpperCase()} instalment for ${monthLabel} is due ${diffDays === 0 ? 'today' : `on ${formatDueDate(dueDateThisMonth)}`}.`,
          }).catch((err: any) => console.error('[Push] Reminder push failed:', err.message));
          sendPaymentDueReminderWhatsApp(
            member,
            inv,
            diffDays === 0 ? 'today' : formatDueDate(dueDateThisMonth)
          ).catch((err: any) => console.error('[WhatsApp] Reminder message failed:', err.message));
          remindersSent++;
        }
      }
    }
 
    console.log(`✅ [Reminder Job] Done. Sent ${remindersSent} reminder(s).`);
  } catch (err: any) {
    console.error('❌ [Reminder Job] Error:', err.message);
  }
}
 
// ─────────────────────────────────────────────────────────────────────────────
//  SCHEDULE: runs once a day at 9:00 AM server time
// ─────────────────────────────────────────────────────────────────────────────
export function startPaymentReminderScheduler(): void {
  cron.schedule('0 9 * * *', runReminderCheck);
  console.log('📅 Payment reminder scheduler active: daily at 9:00 AM');
}
 
// Exported so you can manually trigger it once to test (see HOW_TO_INTEGRATE.md)
export { runReminderCheck };