import { Router } from 'express';
import { AuthController } from './controller.ts';
import { authLimiter } from '../../shared/middlewares/rateLimiter.ts';

const router = Router();
const controller = new AuthController();

router.post('/login/admin', authLimiter, controller.adminLogin.bind(controller));
router.post('/login/member', authLimiter, controller.memberLogin.bind(controller));

export default router;