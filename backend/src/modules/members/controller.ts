import { Request, Response } from 'express';
import { MemberService } from './service.ts';
import jwt from 'jsonwebtoken';

const service = new MemberService();
const jwtSecret = process.env.JWT_SECRET as string;

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

  // Returns fresh member data for the logged-in member using their JWT
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        res.status(401).json({ error: 'Missing member token.' });
        return;
      }

      let payload: any;
      try {
        payload = jwt.verify(token, jwtSecret);
      } catch {
        res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
        return;
      }

      const members = await service.getAllMembers();
      const member = members.find(m => m.id === payload.id);

      if (!member) {
        res.status(404).json({ error: 'Member account not found.' });
        return;
      }

      if (member.status !== 'Active') {
        res.status(403).json({ error: 'Member account is suspended.' });
        return;
      }

      const { password, ...safeMember } = member as any;
      res.json({ success: true, member: safeMember });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch member data.' });
    }
  }
}