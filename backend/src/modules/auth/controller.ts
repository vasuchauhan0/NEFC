import { Request, Response } from 'express';
import { AuthService } from './service.ts';
import jwt from 'jsonwebtoken';

const authService = new AuthService();

const jwtSecret = process.env.JWT_SECRET as string;
if (!jwtSecret) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

export class AuthController {
  async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      const result = await authService.adminLogin(password);

      if (result.success && result.token) {
        // Issue a signed JWT for admin session, valid for 8 hours
        const jwtToken = jwt.sign(
          { role: 'admin' },
          jwtSecret,
          { expiresIn: '8h' }
        );
        res.json({ ...result, jwtToken });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async memberLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.memberLogin(email, password);

      if (result.success && result.member) {
        // Issue a signed JWT for member session, valid for 7 days
        const token = jwt.sign(
          { id: result.member.id, email: result.member.email },
          jwtSecret,
          { expiresIn: '7d' }
        );
        res.json({ ...result, token });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Member login error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}