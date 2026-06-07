import { Router } from 'express';
import { MemberController } from './controller.ts';

const router = Router();
const controller = new MemberController();

router.post('/members', controller.handleMembersAction.bind(controller));

export default router;
