import { getDatabase } from '../../shared/utils/db.ts';

export class DashboardService {
  // Public data only
  async getPublicData() {
    const data = await getDatabase() as any;
    return {
      company:      data.company,
      hero:         data.hero,
      announcement: data.announcement,
      stats:        data.stats,
      steps:        data.steps,
      trust:        data.trust,
      schemes:      data.schemes,
    };
  }

  // Full data for admin
  async getFullData() {
    return getDatabase();
  }
}