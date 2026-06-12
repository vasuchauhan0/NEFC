import { Router } from 'express';
import { AnnouncementController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new AnnouncementController();

router.post('/announcement', requireAdmin, controller.setAnnouncement.bind(controller));

export default router;
