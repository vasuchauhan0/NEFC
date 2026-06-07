import { Router } from 'express';
import { AnnouncementController } from './controller.ts';

const router = Router();
const controller = new AnnouncementController();

router.post('/announcement', controller.setAnnouncement.bind(controller));

export default router;
