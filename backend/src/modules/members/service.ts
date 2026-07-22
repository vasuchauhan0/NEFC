import { MemberRepository } from './repository.ts';
import { Member, MemberInvestment } from '../../shared/types/index.ts';

const repository = new MemberRepository();

export class MemberService {
  async getAllMembers(): Promise<Member[]> {
    return repository.getAll();
  }

  async saveMember(member: Member): Promise<Member[]> {
    return repository.save(member);
  }

  async deleteMember(id: string): Promise<Member[]> {
    return repository.delete(id);
  }

  async updatePhoto(memberId: string, photoUrl: string | null): Promise<Member[]> {
    return repository.updatePhoto(memberId, photoUrl);
  }

  async addInvestment(memberId: string, investment: Omit<MemberInvestment, 'id'>): Promise<Member[]> {
    return repository.addInvestment(memberId, investment);
  }

  async deleteInvestment(memberId: string, investmentId: string): Promise<Member[]> {
    return repository.deleteInvestment(memberId, investmentId);
  }

  async updateInvestmentAmount(memberId: string, investmentId: string, amount: number): Promise<Member[]> {
    return repository.updateInvestmentAmount(memberId, investmentId, amount);
  }

  async updatePaidMonths(memberId: string, investmentId: string, paidMonths: string[]): Promise<Member[]> {
    return repository.updatePaidMonths(memberId, investmentId, paidMonths);
  }
}
