import { getDatabase, saveDatabase } from '../../shared/utils/db.ts';

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(text: string): Promise<string> {
    const data = await getDatabase();
    data.announcement = text || '';
    await saveDatabase(data);
    return data.announcement;
  }
}
