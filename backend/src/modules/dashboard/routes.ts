import { Router, Request, Response, NextFunction } from 'express';
import { DashboardController } from './controller.ts';

const router = Router();
const controller = new DashboardController();

// Public route — no sensitive data
router.get('/data', controller.getPublicData.bind(controller));

// Protected route — full data for admin only
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'];
  if (token !== 'admin-session-token') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.get('/admin/data', requireAdmin, controller.getFullData.bind(controller));

export default router;