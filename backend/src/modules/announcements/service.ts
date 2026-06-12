import { getDatabase, saveDatabase, supabase, useSupabase } from '../../shared/utils/db.ts';

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(text: string): Promise<string> {
    if (!useSupabase) {
      const data = await getDatabase();
      data.announcement = text || '';
      await saveDatabase(data);
      return data.announcement;
    } else {
      const announcementVal = text || '';
      await supabase.from('site_settings').upsert({ key: 'announcement', value: announcementVal });
      return announcementVal;
    }
  }
}
