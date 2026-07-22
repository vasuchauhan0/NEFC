import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { MemberController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';
import { requireMember } from '../../shared/middlewares/requireMember.ts';

const router = Router();
const controller = new MemberController();

// Files are held in memory only long enough for the controller to write
// them to the uploads volume itself (so we control the filename/location).
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

// Wraps multer so a bad upload (too large, wrong type) comes back as a
// normal JSON error response instead of an unhandled exception.
function handlePhotoUpload(req: Request, res: Response, next: NextFunction) {
  photoUpload.single('photo')(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Upload failed.' });
      return;
    }
    next();
  });
}

router.post('/members', requireAdmin, controller.handleMembersAction.bind(controller));
router.get('/member/me', controller.getMe.bind(controller));
router.post('/member/me/photo', requireMember, handlePhotoUpload, controller.uploadPhoto.bind(controller));

export default router;