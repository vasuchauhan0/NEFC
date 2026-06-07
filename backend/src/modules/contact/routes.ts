import { Router } from 'express';
import { ContactController } from './controller.ts';

const router = Router();
const controller = new ContactController();

router.post('/contact', controller.sendMessage.bind(controller));
router.post('/messages/read', controller.markReadState.bind(controller));
router.post('/messages/mark-all-read', controller.markAllMessagesRead.bind(controller));
router.post('/messages/delete', controller.deleteMessage.bind(controller));

export default router;
