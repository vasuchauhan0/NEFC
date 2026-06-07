import { Request, Response } from 'express';
import { CMSService } from './service.ts';

const service = new CMSService();

export class CMSController {
  async updateHero(req: Request, res: Response): Promise<void> {
    try {
      const { tag, title, subtitle } = req.body;
      const hero = await service.updateHero({ tag, title, subtitle });
      res.json({ success: true, hero });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update hero content' });
    }
  }

  async updateStats(req: Request, res: Response): Promise<void> {
    try {
      const { stats } = req.body;
      const updatedStats = await service.updateStats(stats);
      res.json({ success: true, stats: updatedStats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update stats content' });
    }
  }

  async updateSteps(req: Request, res: Response): Promise<void> {
    try {
      const { steps } = req.body;
      const updatedSteps = await service.updateSteps(steps);
      res.json({ success: true, steps: updatedSteps });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update steps' });
    }
  }

  async updateTrust(req: Request, res: Response): Promise<void> {
    try {
      const { trust } = req.body;
      const updatedTrust = await service.updateTrust(trust);
      res.json({ success: true, trust: updatedTrust });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update trust points' });
    }
  }

  async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { company, newAdminPass } = req.body;
      const result = await service.updateCompany(company, newAdminPass);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update company info' });
    }
  }
}
