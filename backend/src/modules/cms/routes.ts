import { Router } from 'express';
import { CMSController } from './controller.ts';

const router = Router();
const controller = new CMSController();

router.post('/hero', controller.updateHero.bind(controller));
router.post('/stats', controller.updateStats.bind(controller));
router.post('/steps', controller.updateSteps.bind(controller));
router.post('/trust', controller.updateTrust.bind(controller));
router.post('/company', controller.updateCompany.bind(controller));

export default router;
