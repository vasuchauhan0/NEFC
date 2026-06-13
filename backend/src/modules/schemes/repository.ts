import { getDatabase, deleteSchemeById, supabase } from '../../shared/utils/db';
import { InvestmentScheme } from '../../shared/types';

export class SchemeRepository {
  async getAll(): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    return data.schemes || [];
  }

  async save(scheme: InvestmentScheme): Promise<InvestmentScheme[]> {
    await supabase.from('schemes').upsert({
      id: scheme.id,
      type: scheme.type,
      duration_years: scheme.durationYears,
      interest_pct: scheme.interestPct,
      maturity_amount_preview: scheme.maturityAmountPreview,
      status: scheme.status,
    });
    return this.getAll();
  }

  async delete(id: string): Promise<InvestmentScheme[]> {
    await deleteSchemeById(id);
    return this.getAll();
  }

  async updateBulkRates(rates: Record<string, { interestPct: number; maturityAmountPreview: number }>): Promise<InvestmentScheme[]> {
    for (const [id, r] of Object.entries(rates)) {
      await supabase.from('schemes').update({
        interest_pct: r.interestPct,
        maturity_amount_preview: r.maturityAmountPreview
      }).eq('id', id);
    }
    return this.getAll();
  }
}
