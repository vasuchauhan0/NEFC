import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AnnouncementController } from './controller.ts';
import { requireAdmin } from '../../shared/middlewares/requireAdmin.ts';

const router = Router();
const controller = new AnnouncementController();

// Files are held in memory only long enough for the controller to write
// them to the uploads volume itself (same pattern as member photo uploads).
const imageUpload = multer({
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

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  imageUpload.single('image')(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Upload failed.' });
      return;
    }
    next();
  });
}

router.post('/announcement', requireAdmin, controller.setAnnouncement.bind(controller));
router.post(
  '/announcement/image',
  requireAdmin,
  handleImageUpload,
  controller.uploadAnnouncementImage.bind(controller)
);

export default router;