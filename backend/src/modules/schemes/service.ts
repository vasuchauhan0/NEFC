import { SchemeRepository } from './repository.ts';
import { InvestmentScheme } from '../../shared/types/index.ts';

const repository = new SchemeRepository();

export class SchemeService {
  async getAllSchemes(): Promise<InvestmentScheme[]> {
    return repository.getAll();
  }

  async saveScheme(scheme: InvestmentScheme): Promise<InvestmentScheme[]> {
    return repository.save(scheme);
  }

  async deleteScheme(id: string): Promise<InvestmentScheme[]> {
    return repository.delete(id);
  }

  async updateBulkRates(rates: Record<string, { interestPct: number; maturityAmountPreview: number }>): Promise<InvestmentScheme[]> {
    return repository.updateBulkRates(rates);
  }
}
