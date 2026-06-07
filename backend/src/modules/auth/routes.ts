import { Router } from 'express';
import { AuthController } from './controller.ts';

const router = Router();
const controller = new AuthController();

router.post('/login/admin', controller.adminLogin.bind(controller));
router.post('/login/member', controller.memberLogin.bind(controller));

export default router;
