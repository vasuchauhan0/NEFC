import { getDatabase, saveDatabase, deleteMemberById, deleteInvestmentById } from '../../shared/utils/db.ts';
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
  }

  async delete(id: string): Promise<Member[]> {
    // Direct targeted delete — does NOT touch other members
    await deleteMemberById(id);
    return this.getAll();
  }

  async addInvestment(memberId: string, investment: Omit<MemberInvestment, 'id'>): Promise<Member[]> {
    const data = await getDatabase();
    const mem = data.members.find(m => m.id === memberId);
    if (mem) {
      if (!mem.investments) mem.investments = [];
      mem.investments.unshift({
        ...investment,
        id: `INV-${Date.now()}`
      } as MemberInvestment);
      await saveDatabase(data);
    }
    return data.members;
  }

  async deleteInvestment(memberId: string, investmentId: string): Promise<Member[]> {
    // Direct targeted delete — does NOT touch other investments or members
    await deleteInvestmentById(investmentId);
    return this.getAll();
  }
}