import { deleteMemberById, deleteInvestmentById, deleteLoanById, rowToLoan, supabase } from '../../shared/utils/db';
import { Member, MemberInvestment, MemberLoan } from '../../shared/types';

// Flat-rate EMI: interest = principal x rate% x years, charged on the full principal
// for the whole tenure. EMI = (principal + interest) / months.
// Computed server-side so the stored value is authoritative.
export function computeEmi(principal: number, annualPct: number, months: number): number {
  if (months <= 0) return 0;
  const interest = (principal * annualPct * (months / 12)) / 100;
  return Math.round((principal + interest) / months);
}

export class MemberRepository {
  async getAll(): Promise<Member[]> {
    const { data: membersData } = await supabase.from('members').select('*');
    const { data: investmentsData } = await supabase.from('member_investments').select('*');
    const { data: loansData } = await supabase.from('member_loans').select('*');

    return (membersData || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      city: r.city,
      password: r.password,
      status: r.status,
      memberSince: r.member_since,
      fatherName: r.father_name ?? undefined,
      aadharNumber: r.aadhar_number ?? undefined,
      panNumber: r.pan_number ?? undefined,
      nomineeName: r.nominee_name ?? undefined,
      nomineeRelation: r.nominee_relation ?? undefined,
      photoUrl: r.photo_url ?? undefined,
      investments: (investmentsData || [])
        .filter((i: any) => i.member_id === r.id)
        .map((i: any) => ({
          id: i.id,
          schemeId: i.scheme_id,
          schemeType: i.scheme_type,
          amount: i.amount,
          interestPct: i.interest_pct,
          durationYears: i.duration_years,
          startDate: i.start_date,
          maturityDate: i.maturity_date,
          status: i.status,
          paidMonths: i.paid_months ?? [],
        })),
      loans: (loansData || [])
        .filter((l: any) => l.member_id === r.id)
        .map(rowToLoan),
    }));
  }

  async findById(id: string): Promise<Member | undefined> {
    const members = await this.getAll();
    return members.find(m => m.id === id);
  }

  async save(member: Member): Promise<Member[]> {
    const memberSinceVal = member.memberSince || new Date().toISOString().split('T')[0];
    await supabase.from('members').upsert({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      city: member.city,
      password: member.password || 'nefc@123',
      status: member.status || 'Active',
      member_since: memberSinceVal,
      father_name: member.fatherName ?? null,
      aadhar_number: member.aadharNumber ?? null,
      pan_number: member.panNumber ?? null,
      nominee_name: member.nomineeName ?? null,
      nominee_relation: member.nomineeRelation ?? null,
    });
    return this.getAll();
  }

  // Deliberately separate from save(): save() is the admin panel's full-record
  // upsert, and its payload never carries photoUrl, so folding photo_url into
  // that upsert would null out an existing photo on every unrelated admin edit.
  async updatePhoto(memberId: string, photoUrl: string | null): Promise<Member[]> {
    await supabase.from('members').update({ photo_url: photoUrl }).eq('id', memberId);
    return this.getAll();
  }

  async delete(id: string): Promise<Member[]> {
    await deleteMemberById(id);
    return this.getAll();
  }

  async addInvestment(memberId: string, investment: Omit<MemberInvestment, 'id'>): Promise<Member[]> {
    const invId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await supabase.from('member_investments').insert({
      id: invId,
      member_id: memberId,
      scheme_id: investment.schemeId,
      scheme_type: investment.schemeType,
      amount: investment.amount,
      interest_pct: investment.interestPct,
      duration_years: investment.durationYears,
      start_date: investment.startDate,
      maturity_date: investment.maturityDate,
      status: investment.status,
      paid_months: investment.paidMonths ?? [],
    });
    return this.getAll();
  }

  async deleteInvestment(memberId: string, investmentId: string): Promise<Member[]> {
    await deleteInvestmentById(investmentId);
    return this.getAll();
  }

  async updateInvestmentAmount(memberId: string, investmentId: string, amount: number): Promise<Member[]> {
    await supabase.from('member_investments').update({ amount }).eq('id', investmentId);
    return this.getAll();
  }

  async updatePaidMonths(memberId: string, investmentId: string, paidMonths: string[]): Promise<Member[]> {
    await supabase.from('member_investments').update({ paid_months: paidMonths }).eq('id', investmentId);
    return this.getAll();
  }

  async addLoan(memberId: string, loan: Pick<MemberLoan, 'principal' | 'interestPct' | 'tenureMonths' | 'startDate' | 'purpose'>): Promise<Member[]> {
    const loanId = `LN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from('member_loans').insert({
      id: loanId,
      member_id: memberId,
      principal: loan.principal,
      interest_pct: loan.interestPct,
      tenure_months: loan.tenureMonths,
      emi_amount: computeEmi(loan.principal, loan.interestPct, loan.tenureMonths),
      start_date: loan.startDate,
      purpose: loan.purpose || null,
      emis_paid: 0,
      status: 'Active',
    });
    if (error) throw new Error(error.message);
    return this.getAll();
  }

  async deleteLoan(memberId: string, loanId: string): Promise<Member[]> {
    await deleteLoanById(loanId);
    return this.getAll();
  }

  async updateLoanEmis(memberId: string, loanId: string, emisPaid: number): Promise<Member[]> {
    const { data: loan } = await supabase.from('member_loans').select('tenure_months').eq('id', loanId).single();
    const tenure = loan?.tenure_months ?? emisPaid;
    const paid = Math.max(0, Math.min(emisPaid, tenure));
    await supabase.from('member_loans').update({
      emis_paid: paid,
      status: paid >= tenure ? 'Closed' : 'Active',
    }).eq('id', loanId);
    return this.getAll();
  }
}