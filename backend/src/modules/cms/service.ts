import { CMSRepository } from './repository.ts';
import { HeroContent, StatItem, StepItem, TrustItem, Company } from '../../shared/types/index.ts';

const repository = new CMSRepository();

export class CMSService {
  async updateHero(hero: HeroContent): Promise<HeroContent> {
    return repository.updateHero(hero);
  }

  async updateStats(stats: StatItem[]): Promise<StatItem[]> {
    return repository.updateStats(stats);
  }

  async updateSteps(steps: StepItem[]): Promise<StepItem[]> {
    return repository.updateSteps(steps);
  }

  async updateTrust(trust: TrustItem[]): Promise<TrustItem[]> {
    return repository.updateTrust(trust);
  }

  async updateCompany(company?: Company, newAdminPass?: string): Promise<{ company: Company; adminPassChanged: boolean }> {
    return repository.updateCompany(company, newAdminPass);
  }
}
