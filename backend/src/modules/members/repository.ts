import { deleteMemberById, deleteInvestmentById, supabase } from '../../shared/utils/db';
import { Member, MemberInvestment } from '../../shared/types';

export class MemberRepository {
  async getAll(): Promise<Member[]> {
    const { data: membersData } = await supabase.from('members').select('*');
    const { data: investmentsData } = await supabase.from('member_investments').select('*');

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
  async updatePhoto(memberId: string, photoUrl: string): Promise<Member[]> {
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
}