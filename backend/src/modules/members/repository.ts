import { getDatabase, saveDatabase, deleteMemberById, deleteInvestmentById, supabase, useSupabase } from '../../shared/utils/db.ts';
import { Member, MemberInvestment } from '../../shared/types/index.ts';

export class MemberRepository {
  async getAll(): Promise<Member[]> {
    const data = await getDatabase();
    return data.members || [];
  }

  async findById(id: string): Promise<Member | undefined> {
    const members = await this.getAll();
    return members.find(m => m.id === id);
  }

  async save(member: Member): Promise<Member[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      const existingIdx = data.members.findIndex(m => m.id === member.id);

      if (existingIdx !== -1) {
        data.members[existingIdx] = {
          ...data.members[existingIdx],
          ...member,
          investments: member.investments || data.members[existingIdx].investments || []
        };
      } else {
        const newMember: Member = {
          ...member,
          investments: member.investments || [],
          memberSince: member.memberSince || new Date().toISOString().split('T')[0]
        };
        data.members.unshift(newMember);
      }

      await saveDatabase(data);
      return data.members;
    } else {
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
  }

  async delete(id: string): Promise<Member[]> {
    // Direct targeted delete — does NOT touch other members
    await deleteMemberById(id);
    return this.getAll();
  }

  async addInvestment(memberId: string, investment: Omit<MemberInvestment, 'id'>): Promise<Member[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      const mem = data.members.find(m => m.id === memberId);
      if (mem) {
        if (!mem.investments) mem.investments = [];
        mem.investments.unshift({
          ...investment,
          id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        } as MemberInvestment);
        await saveDatabase(data);
      }
      return data.members;
    } else {
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
  }

  async deleteInvestment(memberId: string, investmentId: string): Promise<Member[]> {
    // Direct targeted delete — does NOT touch other investments or members
    await deleteInvestmentById(investmentId);
    return this.getAll();
  }

  async updateInvestmentAmount(memberId: string, investmentId: string, amount: number): Promise<Member[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      const mem = data.members.find(m => m.id === memberId);
      if (mem && mem.investments) {
        const inv = mem.investments.find(i => i.id === investmentId);
        if (inv) {
          inv.amount = amount;
          await saveDatabase(data);
        }
      }
      return data.members;
    } else {
      await supabase.from('member_investments').update({ amount }).eq('id', investmentId);
      return this.getAll();
    }
  }

  async updatePaidMonths(memberId: string, investmentId: string, paidMonths: string[]): Promise<Member[]> {
    if (!useSupabase) {
      const data = await getDatabase();
      const mem = data.members.find(m => m.id === memberId);
      if (mem && mem.investments) {
        const inv = mem.investments.find(i => i.id === investmentId);
        if (inv) {
          inv.paidMonths = paidMonths;
          await saveDatabase(data);
        }
      }
      return data.members;
    } else {
      await supabase.from('member_investments').update({ paid_months: paidMonths }).eq('id', investmentId);
      return this.getAll();
    }
  }
}