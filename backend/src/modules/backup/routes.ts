import { Router } from 'express';
import { BackupController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new BackupController();

router.post('/data/reset', requireAdmin, controller.resetData.bind(controller));
router.post('/data/import', requireAdmin, controller.importData.bind(controller));

export default router;
