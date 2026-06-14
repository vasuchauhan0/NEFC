import { supabase } from '../../shared/utils/db';
import { HeroContent, StatItem, StepItem, TrustItem, Company } from '../../shared/types';

export class CMSRepository {
  async updateHero(hero: HeroContent): Promise<HeroContent> {
    await supabase.from('site_settings').upsert({ key: 'hero', value: hero });
    return hero;
  }

  async updateStats(stats: StatItem[]): Promise<StatItem[]> {
    await supabase.from('site_settings').upsert({ key: 'stats', value: stats });
    return stats;
  }

  async updateSteps(steps: StepItem[]): Promise<StepItem[]> {
    await supabase.from('site_settings').upsert({ key: 'steps', value: steps });
    return steps;
  }

  async updateTrust(trust: TrustItem[]): Promise<TrustItem[]> {
    await supabase.from('site_settings').upsert({ key: 'trust', value: trust });
    return trust;
  }

  async updateCompany(company?: Company, newAdminPass?: string): Promise<{ company: Company; adminPassChanged: boolean }> {
    await Promise.all([
      company ? supabase.from('site_settings').upsert({ key: 'company', value: company }) : Promise.resolve(),
      newAdminPass ? supabase.from('site_settings').upsert({ key: 'adminPass', value: newAdminPass }) : Promise.resolve(),
    ]);
    return { company: company as Company, adminPassChanged: !!newAdminPass };
  }
}