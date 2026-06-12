import { getDatabase, saveDatabase, deleteSchemeById, supabase, useSupabase } from '../../shared/utils/db.ts';
import { InvestmentScheme } from '../../shared/types/index.ts';

export class SchemeRepository {
  async getAll(): Promise<InvestmentScheme[]> {
    const data = await getDatabase();
    return data.schemes || [];
  }

  async save(scheme: InvestmentScheme): Promise<InvestmentScheme[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      const existingIdx = data.schemes.findIndex(s => s.id === scheme.id);

      if (existingIdx !== -1) {
        data.schemes[existingIdx] = scheme;
      } else {
        data.schemes.push(scheme);
      }

      await saveDatabase(data);
      return data.schemes;
    } else {
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
  }

  async delete(id: string): Promise<InvestmentScheme[]> {
    // Direct targeted delete — does NOT touch other schemes
    await deleteSchemeById(id);
    return this.getAll();
  }

  async updateBulkRates(rates: Record<string, { interestPct: number; maturityAmountPreview: number }>): Promise<InvestmentScheme[]> {
    if (!useSupabase) {
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
    } else {
      // Direct updates for schemes
      for (const [id, r] of Object.entries(rates)) {
        await supabase.from('schemes').update({
          interest_pct: r.interestPct,
          maturity_amount_preview: r.maturityAmountPreview
        }).eq('id', id);
      }
      return this.getAll();
    }
  }
}