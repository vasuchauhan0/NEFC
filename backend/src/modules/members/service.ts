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

  async addInvestment(memberId: string, investment: Omit<MemberInvestment, 'id'>): Promise<Member[]> {
    return repository.addInvestment(memberId, investment);
  }

  async deleteInvestment(memberId: string, investmentId: string): Promise<Member[]> {
    return repository.deleteInvestment(memberId, investmentId);
  }
}
