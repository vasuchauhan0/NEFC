import { Request, Response } from 'express';
import { MemberService } from './service.ts';

const service = new MemberService();

export class MemberController {
  async handleMembersAction(req: Request, res: Response): Promise<void> {
    try {
      const { action, member, id, memberId, investment, investmentId } = req.body;

      if (action === 'save') {
        const list = await service.saveMember(member);
        res.json({ success: true, members: list });
      } else if (action === 'delete') {
        const list = await service.deleteMember(id);
        res.json({ success: true, members: list });
      } else if (action === 'add-investment') {
        const list = await service.addInvestment(memberId, investment);
        res.json({ success: true, members: list });
      } else if (action === 'delete-investment') {
        const list = await service.deleteInvestment(memberId, investmentId);
        res.json({ success: true, members: list });
      } else {
        res.status(400).json({ error: 'Invalid action parameter specified' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete member management action' });
    }
  }
}
