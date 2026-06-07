import { Router } from 'express';
import { BackupController } from './controller.ts';

const router = Router();
const controller = new BackupController();

router.post('/data/reset', controller.resetData.bind(controller));
router.post('/data/import', controller.importData.bind(controller));

export default router;
