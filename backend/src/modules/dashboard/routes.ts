import { Router } from 'express';
import { DashboardController } from './controller.ts';

const router = Router();
const controller = new DashboardController();

router.get('/data', controller.getFullData.bind(controller));

export default router;
