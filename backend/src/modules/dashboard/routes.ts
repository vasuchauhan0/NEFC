import { Router, Request, Response, NextFunction } from 'express';
import { DashboardController } from './controller.ts';
import { verifyAdminToken } from '../../shared/utils/db.ts';

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

export default router;