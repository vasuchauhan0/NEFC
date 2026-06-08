import { Request, Response } from 'express';
import { DashboardService } from './service.ts';

const service = new DashboardService();

export class DashboardController {
  // Public — no sensitive data
  async getPublicData(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getPublicData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve data' });
    }
  }

  // Admin only — full data
  async getFullData(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getFullData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve admin data' });
    }
  }
}