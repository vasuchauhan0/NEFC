import { getDatabase } from '../../shared/utils/db.ts';
import { SiteData } from '../../shared/types/index.ts';

export class DashboardService {
  async getFullData(): Promise<SiteData> {
    return getDatabase();
  }
}
