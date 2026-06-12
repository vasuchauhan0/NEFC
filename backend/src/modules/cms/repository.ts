import { getDatabase, saveDatabase, supabase, useSupabase } from '../../shared/utils/db.ts';
import { HeroContent, StatItem, StepItem, TrustItem, Company } from '../../shared/types/index.ts';

export class CMSRepository {
  async updateHero(hero: HeroContent): Promise<HeroContent> {
    if (!useSupabase) {
      const data = await getDatabase();
      data.hero = hero;
      await saveDatabase(data);
      return data.hero;
    } else {
      await supabase.from('site_settings').upsert({ key: 'hero', value: hero });
      return hero;
    }
  }

  async updateStats(stats: StatItem[]): Promise<StatItem[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      data.stats = stats;
      await saveDatabase(data);
      return data.stats;
    } else {
      await supabase.from('site_settings').upsert({ key: 'stats', value: stats });
      return stats;
    }
  }

  async updateSteps(steps: StepItem[]): Promise<StepItem[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      data.steps = steps;
      await saveDatabase(data);
      return data.steps;
    } else {
      await supabase.from('site_settings').upsert({ key: 'steps', value: steps });
      return steps;
    }
  }

  async updateTrust(trust: TrustItem[]): Promise<TrustItem[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      data.trust = trust;
      await saveDatabase(data);
      return data.trust;
    } else {
      await supabase.from('site_settings').upsert({ key: 'trust', value: trust });
      return trust;
    }
  }

  async updateCompany(company?: Company, newAdminPass?: string): Promise<{ company: Company; adminPassChanged: boolean }> {
    if (!useSupabase) {
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
    } else {
      let adminPassChanged = false;
      if (company) {
        await supabase.from('site_settings').upsert({ key: 'company', value: company });
      }
      if (newAdminPass) {
        await supabase.from('site_settings').upsert({ key: 'adminPass', value: newAdminPass });
        adminPassChanged = true;
      }
      const data = await getDatabase();
      return { company: data.company, adminPassChanged };
    }
  }
}
