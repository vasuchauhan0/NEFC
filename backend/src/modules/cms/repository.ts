import { getDatabase, saveDatabase } from '../../shared/utils/db.ts';
import { HeroContent, StatItem, StepItem, TrustItem, Company } from '../../shared/types/index.ts';

export class CMSRepository {
  async updateHero(hero: HeroContent): Promise<HeroContent> {
    const data = await getDatabase();
    data.hero = hero;
    await saveDatabase(data);
    return data.hero;
  }

  async updateStats(stats: StatItem[]): Promise<StatItem[]> {
    const data = await getDatabase();
    data.stats = stats;
    await saveDatabase(data);
    return data.stats;
  }

  async updateSteps(steps: StepItem[]): Promise<StepItem[]> {
    const data = await getDatabase();
    data.steps = steps;
    await saveDatabase(data);
    return data.steps;
  }

  async updateTrust(trust: TrustItem[]): Promise<TrustItem[]> {
    const data = await getDatabase();
    data.trust = trust;
    await saveDatabase(data);
    return data.trust;
  }

  async updateCompany(company?: Company, newAdminPass?: string): Promise<{ company: Company; adminPassChanged: boolean }> {
    const data = await getDatabase();
    let adminPassChanged = false;
    
    if (company) {
      data.company = company;
    }
    if (newAdminPass) {
      data.adminPass = newAdminPass;
      adminPassChanged = true;
    }
    
    await saveDatabase(data);
    return { company: data.company, adminPassChanged };
  }
}
