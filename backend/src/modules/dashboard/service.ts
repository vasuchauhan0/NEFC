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
  const data = await getDatabase();
  return {
    ...data,
    members: data.members.map(({ password, aadharNumber, panNumber, ...safe }) => safe),
    adminPass: undefined   // never send admin password to frontend
  };
}
}