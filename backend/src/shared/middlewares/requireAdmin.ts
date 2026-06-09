import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/db.ts';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['x-admin-token'] as string;

  if (!token) {
    res.status(401).json({ error: 'Admin token missing. Access denied.' });
    return;
  }

  const isValid = await verifyAdminToken(token);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid or expired admin session. Access denied.' });
    return;
  }

  next();
}