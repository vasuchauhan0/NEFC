import { getDatabase, supabase } from '../../shared/utils/db';
import { MemberService } from '../members/service.ts';
import { sendPushToAllMembers } from '../../shared/utils/push.service.ts';
import { sendAnnouncementWhatsApp } from '../../shared/utils/whatsapp.service.ts';

const memberService = new MemberService();

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(text: string, sendWhatsapp: boolean = false): Promise<string> {
    const announcementVal = text || '';
    await supabase.from('site_settings').upsert({ key: 'announcement', value: announcementVal });

    // Push notifications still go out to every active member whenever the
    // banner is set — this is silent/free and low-annoyance.
    if (announcementVal.trim()) {
      const members = await memberService.getAllMembers();
      const activeMembers = members.filter(m => m.status === 'Active');
      const activeMemberIds = activeMembers.map(m => m.id);

      sendPushToAllMembers(activeMemberIds, {
        title: 'NEFC Announcement',
        body: announcementVal,
      }).catch(err => console.error('[Push] Announcement broadcast failed:', err.message));

      // WhatsApp broadcast is OPT-IN per publish — only fires when the admin
      // explicitly ticks "Also send via WhatsApp" on the Announcements page,
      // since each send costs money / uses up template-messaging quota.
      if (sendWhatsapp) {
        sendAnnouncementWhatsApp(activeMembers, announcementVal).catch(err =>
          console.error('[WhatsApp] Announcement broadcast failed:', err.message)
        );
      }
    }

    return announcementVal;
  }
}