import { deleteSchemeById, supabase } from '../../shared/utils/db';
import { InvestmentScheme } from '../../shared/types';

export class SchemeRepository {
  async getAll(): Promise<InvestmentScheme[]> {
    const { data } = await supabase.from('schemes').select('*');
    return (data || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      durationYears: r.duration_years,
      interestPct: r.interest_pct,
      maturityAmountPreview: r.maturity_amount_preview,
      status: r.status,
    }));
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
    await Promise.all(
      Object.entries(rates).map(([id, r]) =>
        supabase.from('schemes').update({
          interest_pct: r.interestPct,
          maturity_amount_preview: r.maturityAmountPreview
        }).eq('id', id)
      )
    );
    return this.getAll();
  }
}