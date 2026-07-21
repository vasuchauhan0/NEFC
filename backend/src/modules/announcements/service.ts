import { getDatabase, supabase } from '../../shared/utils/db';
import { MemberService } from '../members/service.ts';
import { sendPushToAllMembers } from '../../shared/utils/push.service.ts';

const memberService = new MemberService();

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(text: string): Promise<string> {
    const announcementVal = text || '';
    await supabase.from('site_settings').upsert({ key: 'announcement', value: announcementVal });

    // Push the announcement to every active member's phone as well, so it
    // isn't only visible to people who happen to open the website.
    if (announcementVal.trim()) {
      const members = await memberService.getAllMembers();
      const activeMemberIds = members.filter(m => m.status === 'Active').map(m => m.id);
      sendPushToAllMembers(activeMemberIds, {
        title: 'NEFC Announcement',
        body: announcementVal,
      }).catch(err => console.error('[Push] Announcement broadcast failed:', err.message));
    }

    return announcementVal;
  }
}