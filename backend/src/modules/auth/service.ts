import { getDatabase, saveAdminToken } from '../../shared/utils/db.ts';
import { Member } from '../../shared/types/index.ts';

const adminTracker = {
  failedAttempts: 0,
  lockoutUntil: 0,
};

export class AuthService {
  async adminLogin(pass: string): Promise<{ success: boolean; error?: string; token?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const now = Date.now();
    if (adminTracker.lockoutUntil > now) {
      const waitSeconds = Math.ceil((adminTracker.lockoutUntil - now) / 1000);
      return { success: false, error: `Too many failed login attempts. Please wait ${waitSeconds} seconds.` };
    }

    const dbData = await getDatabase();
    const dbPassword = dbData?.adminPass;
    const envPassword = process.env.ADMIN_PASSWORD;
    const isValid = (dbPassword && pass === dbPassword) || (envPassword && pass === envPassword);

    if (isValid) {
      adminTracker.failedAttempts = 0;
      adminTracker.lockoutUntil = 0;
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await saveAdminToken(token);  // ← saved to Supabase, survives restarts
      return { success: true, token };
    }

    adminTracker.failedAttempts += 1;
    if (adminTracker.failedAttempts >= 5) {
      adminTracker.lockoutUntil = now + 60000;
      return { success: false, error: 'Incorrect administrator password. Device blocked for 60 seconds.' };
    }

    return { success: false, error: 'Incorrect administrator password' };
  }

  async memberLogin(email: string, pass: string): Promise<{ success: boolean; error?: string; member?: Member }> {
    const data = await getDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const member = data.members.find(
      m => m.email.toLowerCase().trim() === cleanEmail && m.password === pass
    );
    if (!member) return { success: false, error: 'Invalid email address or password.' };
    if (member.status !== 'Active') return { success: false, error: 'Member account is currently suspended or Inactive.' };
    return { success: true, member };
  }
}