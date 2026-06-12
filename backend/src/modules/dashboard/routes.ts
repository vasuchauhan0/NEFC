import { Router, Request, Response, NextFunction } from 'express';
import { DashboardController } from './controller';
import { verifyAdminToken, saveDatabase } from '../../shared/utils/db';

const router = Router();
const controller = new DashboardController();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const valid = await verifyAdminToken(token);
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.get('/data', controller.getPublicData.bind(controller));
router.get('/admin/data', requireAdmin, controller.getFullData.bind(controller));

router.post('/admin/save-data', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { siteData } = req.body;
    if (!siteData) {
      res.status(400).json({ error: 'Missing siteData payload' });
      return;
    }
    await saveDatabase(siteData);
    res.json({ success: true });
  } catch (err) {
    console.error('[SERVER ERROR] Failed to save database settings:', err);
    res.status(500).json({ error: 'Failed to save admin configurations' });
  }
});

export default router;