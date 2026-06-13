import { getDatabase, supabase } from '../../shared/utils/db';

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(text: string): Promise<string> {
    const announcementVal = text || '';
    await supabase.from('site_settings').upsert({ key: 'announcement', value: announcementVal });
    return announcementVal;
  }
}
