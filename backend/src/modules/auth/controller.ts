import { Request, Response } from 'express';
import { AuthService } from './service.ts';

const authService = new AuthService();

export class AuthController {
  async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      const result = await authService.adminLogin(password);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async memberLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.memberLogin(email, password);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
