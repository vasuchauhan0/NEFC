import { getDatabase, saveDatabase } from '../../shared/utils/db.ts';
import { InvestmentScheme } from '../../shared/types/index.ts';

export class SchemeRepository {
  async getAll(): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    return data.schemes || [];
  }

  async save(scheme: InvestmentScheme): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    const existingIdx = data.schemes.findIndex(s => s.id === scheme.id);

    if (existingIdx !== -1) {
      data.schemes[existingIdx] = scheme;
    } else {
      data.schemes.push(scheme);
    }

    await saveDatabase(data);
    return data.schemes;
  }

  async delete(id: string): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    data.schemes = data.schemes.filter(s => s.id !== id);
    await saveDatabase(data);
    return data.schemes;
  }

  async updateBulkRates(rates: Record<string, { interestPct: number; maturityAmountPreview: number }>): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    data.schemes = data.schemes.map(s => {
      if (rates[s.id]) {
        return {
          ...s,
          interestPct: rates[s.id].interestPct,
          maturityAmountPreview: rates[s.id].maturityAmountPreview
        };
      }
      return s;
    });

    await saveDatabase(data);
    return data.schemes;
  }
}
