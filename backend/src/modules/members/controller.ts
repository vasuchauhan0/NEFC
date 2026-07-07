import { Request, Response } from 'express';
import { MemberService } from './service.ts';
import jwt from 'jsonwebtoken';
import {
  sendWelcomeMessage,
  sendInvestmentUpdateMessage,
  sendPaymentConfirmedMessage,
} from '../../shared/utils/whatsapp.service.ts';
import {
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
} from '../../shared/utils/email.service.ts';
const service = new MemberService();
const jwtSecret = process.env.JWT_SECRET || 'nefc-secret-key-fallback-987654321';
 
export class MemberController {
  async handleMembersAction(req: Request, res: Response): Promise<void> {
    try {
      const { action, member, id, memberId, investment, investmentId, amount, paidMonths } = req.body;
 
      if (action === 'save') {
        // ── Validate & normalize email before saving (defense in depth,
        // in case a request bypasses the admin UI's own validation) ────────
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!member?.email || !emailRegex.test(member.email.trim())) {
          res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
          return;
        }
        member.email = member.email.trim().toLowerCase();

        // `save` is an upsert keyed on id, so check existence BEFORE saving
        // to correctly tell "new member" apart from "editing an existing one"
        const existingMembers = await service.getAllMembers();
        const isNewMember = !existingMembers.some(m => m.id === member.id);

        // Prevent duplicate accounts differing only by case/whitespace
        const emailTaken = existingMembers.some(
          m => m.id !== member.id && m.email.toLowerCase().trim() === member.email
        );
        if (emailTaken) {
          res.status(400).json({ success: false, error: 'A member with this email already exists.' });
          return;
        }
 
        const list = await service.saveMember(member);
 
        // ── WHATSAPP: welcome message for brand-new members ──────────────
        if (isNewMember) {
          const savedMember = list.find(m => m.id === member.id);
          if (savedMember) {
            sendWelcomeMessage(savedMember).catch((err: any) =>
  console.error('[WA] Welcome message failed:', err.message)
);
            sendWelcomeEmail(savedMember).catch((err: any) =>
  console.error('[Email] Welcome email failed:', err.message)
);
          }
        }
        // ───────────────────────────────────────────────────────────────────
 
        res.json({ success: true, members: list });
 
      } else if (action === 'delete') {
        const list = await service.deleteMember(id);
        res.json({ success: true, members: list });
 
      } else if (action === 'add-investment') {
        const list = await service.addInvestment(memberId, investment);
 
        // ── WHATSAPP: notify member of new investment ─────────────────────
        const updatedMember = list.find(m => m.id === memberId);
        const newInvestment = updatedMember?.investments.at(-1); // latest investment just added
        if (updatedMember && newInvestment) {
          sendInvestmentUpdateMessage(updatedMember, newInvestment).catch((err: any) =>
            console.error('[WA] Investment update message failed:', err.message)
          );
        }
        // ───────────────────────────────────────────────────────────────────
 
        res.json({ success: true, members: list });
 
      } else if (action === 'delete-investment') {
        const list = await service.deleteInvestment(memberId, investmentId);
        res.json({ success: true, members: list });
 
      } else if (action === 'update-investment-amount') {
        const list = await service.updateInvestmentAmount(memberId, investmentId, amount);
        res.json({ success: true, members: list });
 
      } else if (action === 'update-paid-months') {
        const list = await service.updatePaidMonths(memberId, investmentId, paidMonths);
 
        // ── WHATSAPP: confirm latest month's payment ───────────────────────
        if (paidMonths?.length > 0) {
          const latestMonth = paidMonths[paidMonths.length - 1]; // e.g. "June 2026"
          const updatedMember = list.find(m => m.id === memberId);
          const inv = updatedMember?.investments.find(i => i.id === investmentId);
          if (updatedMember && inv) {
            sendPaymentConfirmedMessage(updatedMember, inv, latestMonth).catch((err: any) =>
              console.error('[WA] Payment confirmed message failed:', err.message)
            );
            sendPaymentReceiptEmail(updatedMember, inv, latestMonth).catch((err: any) =>
              console.error('[Email] Payment receipt failed:', err.message)
            );
          }
        }
        // ───────────────────────────────────────────────────────────────────
 
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