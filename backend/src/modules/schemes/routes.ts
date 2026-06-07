import { Router } from 'express';
import { SchemeController } from './controller.ts';

const router = Router();
const controller = new SchemeController();

router.post('/schemes', controller.handleSchemesAction.bind(controller));
router.post('/rates', controller.handleBulkRates.bind(controller));

export default router;
