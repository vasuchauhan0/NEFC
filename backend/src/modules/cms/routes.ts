import { Router } from 'express';
import { CMSController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new CMSController();

// These previously had no auth guard at all — anyone who knew the URL could
// overwrite site content (including the org's contact info) without logging in.
router.post('/hero', requireAdmin, controller.updateHero.bind(controller));
router.post('/stats', requireAdmin, controller.updateStats.bind(controller));
router.post('/steps', requireAdmin, controller.updateSteps.bind(controller));
router.post('/trust', requireAdmin, controller.updateTrust.bind(controller));
router.post('/company', requireAdmin, controller.updateCompany.bind(controller));

export default router;