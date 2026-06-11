import { Router } from 'express';
import { MemberController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new MemberController();

router.post('/members', requireAdmin, controller.handleMembersAction.bind(controller));
router.get('/member/me', controller.getMe.bind(controller));

export default router;