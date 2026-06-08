import { Router, Request, Response, NextFunction } from 'express';
import { MemberController } from './controller.ts';

const router = Router();
const controller = new MemberController();

// Check admin token before allowing member changes
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'];
  if (token !== 'admin-session-token') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.post('/members', requireAdmin, controller.handleMembersAction.bind(controller));

export default router;