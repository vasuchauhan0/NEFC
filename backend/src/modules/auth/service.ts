import { getDatabase, saveDatabase, saveAdminToken } from '../../shared/utils/db.ts';
import { Member } from '../../shared/types/index.ts';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class AuthService {
  async adminLogin(pass: string): Promise<{ success: boolean; error?: string; token?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const dbData = await getDatabase();
    const dbPassword = dbData?.adminPass;
    const envPassword = process.env.ADMIN_PASSWORD;

    // Read lockout state from Supabase (survives restarts)
    const failedAttempts = dbData.adminFailedAttempts ?? 0;
    const lockoutUntil = dbData.adminLockoutUntil ?? 0;

    const now = Date.now();
    if (lockoutUntil > now) {
      const waitSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { success: false, error: `Too many failed login attempts. Please wait ${waitSeconds} seconds.` };
    }

    // Timing-safe comparison to prevent timing attacks
    let isDbMatch = false;
    if (dbPassword) {
      try {
        isDbMatch = crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(dbPassword));
      } catch { isDbMatch = false; }
    }

    let isEnvMatch = false;
    if (envPassword) {
      try {
        isEnvMatch = crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(envPassword));
      } catch { isEnvMatch = false; }
    }

    const isValid = isDbMatch || isEnvMatch;

    if (isValid) {
      // Reset lockout in Supabase on success
      dbData.adminFailedAttempts = 0;
      dbData.adminLockoutUntil = 0;
      await saveDatabase(dbData);

      const token = crypto.randomBytes(32).toString('hex');
      await saveAdminToken(token);
      return { success: true, token };
    }

    // Save failed attempt to Supabase
    const nextAttempts = failedAttempts + 1;
    dbData.adminFailedAttempts = nextAttempts;

    if (nextAttempts >= 5) {
      dbData.adminLockoutUntil = now + 60000;
      await saveDatabase(dbData);
      return { success: false, error: 'Incorrect administrator password. Device blocked for 60 seconds.' };
    }

    await saveDatabase(dbData);
    return { success: false, error: 'Incorrect administrator password' };
  }

  async memberLogin(email: string, pass: string): Promise<{ success: boolean; error?: string; member?: Member }> {
    const data = await getDatabase();
    const cleanEmail = email.toLowerCase().trim();

    const memberIndex = data.members.findIndex(
      m => m.email.toLowerCase().trim() === cleanEmail
    );

    if (memberIndex === -1) {
      return { success: false, error: 'Invalid email address or password.' };
    }

    const member = data.members[memberIndex];

    let isMatch = false;
    let needsMigration = false;

    if (member.password && member.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(pass, member.password);
    } else {
      isMatch = member.password === pass;
      if (isMatch) needsMigration = true;
    }

    if (!isMatch) {
      return { success: false, error: 'Invalid email address or password.' };
    }

    if (member.status !== 'Active') {
      return { success: false, error: 'Member account is currently suspended or Inactive.' };
    }

    // Auto-upgrade plain password to bcrypt on first login
    if (needsMigration) {
      const hashed = await bcrypt.hash(pass, 12);
      data.members[memberIndex].password = hashed;
      await saveDatabase(data);
    }

    // Never send password back to frontend
    const { password, ...safeMember } = member;
    return { success: true, member: safeMember as Member };
  }
}