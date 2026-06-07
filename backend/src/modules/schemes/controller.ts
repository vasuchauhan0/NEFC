import { Request, Response } from 'express';
import { SchemeService } from './service.ts';

const service = new SchemeService();

export class SchemeController {
  async handleSchemesAction(req: Request, res: Response): Promise<void> {
    try {
      const { action, scheme, id } = req.body;

      if (action === 'save') {
        const list = await service.saveScheme(scheme);
        res.json({ success: true, schemes: list });
      } else if (action === 'delete') {
        const list = await service.deleteScheme(id);
        res.json({ success: true, schemes: list });
      } else {
        res.status(400).json({ error: 'Invalid action parameter specified' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to manage schemes action' });
    }
  }

  async handleBulkRates(req: Request, res: Response): Promise<void> {
    try {
      const { rates } = req.body;
      if (!rates) {
        res.status(400).json({ error: 'Missing rates data mapping table' });
        return;
      }
      const list = await service.updateBulkRates(rates);
      res.json({ success: true, schemes: list });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update rates' });
    }
  }
}
