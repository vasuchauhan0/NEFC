import { Request, Response } from 'express';
import { ContactService } from './service.ts';

const service = new ContactService();

export class ContactController {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { name, contact, subject, message } = req.body;
      if (!name || !contact || !message) {
        res.status(400).json({ error: 'Missing contact form details.' });
        return;
      }
      const newMsg = await service.addMessage({ name, contact, subject, message });
      res.json({ success: true, message: newMsg });
    } catch (error) {
      res.status(500).json({ error: 'Failed to receive contact message' });
    }
  }

  async markReadState(req: Request, res: Response): Promise<void> {
    try {
      const { id, read } = req.body;
      await service.setReadState(id, read);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update message' });
    }
  }

  async markAllMessagesRead(req: Request, res: Response): Promise<void> {
    try {
      const updatedList = await service.markAllRead();
      res.json({ success: true, messages: updatedList });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.body;
      await service.deleteMessage(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}
