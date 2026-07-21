import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'nefc-secret-key-fallback-987654321';

// Extends Express's Request so downstream handlers can read req.memberId
// without re-decoding the token themselves.
declare global {
  namespace Express {
    interface Request {
      memberId?: string;
    }
  }
}

// Same Bearer-token pattern already used by MemberController.getMe —
// verifies the member's JWT and attaches the member id to the request.
export async function requireMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Missing member token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    if (!payload?.id) {
      res.status(401).json({ error: 'Invalid session token.' });
      return;
    }
    req.memberId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}