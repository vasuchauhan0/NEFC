import { Router } from 'express';
import { ContactController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';
import { contactLimiter } from '../../shared/middlewares/rateLimiter.ts';

const router = Router();
const controller = new ContactController();

router.post('/contact', contactLimiter, controller.sendMessage.bind(controller));
router.post('/messages/read', requireAdmin, controller.markReadState.bind(controller));
router.post('/messages/mark-all-read', requireAdmin, controller.markAllMessagesRead.bind(controller));
router.post('/messages/delete', requireAdmin, controller.deleteMessage.bind(controller));

export default router;