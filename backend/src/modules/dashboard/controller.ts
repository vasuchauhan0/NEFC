import { Request, Response } from 'express';
import { DashboardService } from './service.ts';

const service = new DashboardService();

export class DashboardController {
  async getFullData(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getFullData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve application ledger data' });
    }
  }
}
