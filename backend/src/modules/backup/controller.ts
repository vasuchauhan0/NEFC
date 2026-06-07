import { Request, Response } from 'express';
import { BackupService } from './service.ts';

const service = new BackupService();

export class BackupController {
  async resetData(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.resetData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset site ledger data' });
    }
  }

  async importData(req: Request, res: Response): Promise<void> {
    try {
      const imported = req.body;
      const data = await service.importData(imported);
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to import backup';
      res.status(400).json({ error: msg });
    }
  }
}
