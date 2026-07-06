import { Request, Response } from 'express';
import { AuthService } from './service.ts';
import jwt from 'jsonwebtoken';

const authService = new AuthService();

const jwtSecret = process.env.JWT_SECRET || 'nefc-secret-key-fallback-987654321';

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

  // Step 1: member requests an OTP be emailed to them
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required.' });
        return;
      }
      const result = await authService.requestMemberPasswordReset(email);
      res.json(result);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  // Step 2: member submits OTP + new password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        res.status(400).json({ success: false, error: 'Email, code, and new password are required.' });
        return;
      }
      const result = await authService.resetMemberPassword(email, code, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}