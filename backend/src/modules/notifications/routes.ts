import { Router } from 'express';
import { NotificationsController } from './controller.ts';
import { requireMember } from '../../shared/middlewares/requireMember.ts';

const router = Router();
const controller = new NotificationsController();

// All notification routes are member-scoped — a member can only see/manage
// their own inbox and their own device's push token.
router.post('/notifications/register-token', requireMember, controller.registerToken.bind(controller));
router.post('/notifications/unregister-token', requireMember, controller.unregisterToken.bind(controller));
router.get('/notifications', requireMember, controller.getInbox.bind(controller));
router.post('/notifications/:id/read', requireMember, controller.markRead.bind(controller));
router.post('/notifications/read-all', requireMember, controller.markAllRead.bind(controller));

export default router;