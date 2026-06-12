import { Router } from 'express';
import { SchemeController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new SchemeController();

router.post('/schemes', requireAdmin, controller.handleSchemesAction.bind(controller));
router.post('/rates', requireAdmin, controller.handleBulkRates.bind(controller));

export default router;
