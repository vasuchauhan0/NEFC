import { getDatabase, saveAdminToken, supabase } from '../../shared/utils/db.ts';
import { Member } from '../../shared/types/index.ts';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class AuthService {
  async adminLogin(pass: string): Promise<{ success: boolean; error?: string; token?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const dbData = await getDatabase();
    const dbPassword = dbData?.adminPass;
    const envPassword = process.env.ADMIN_PASSWORD;

    const failedAttempts = dbData.adminFailedAttempts ?? 0;
    const lockoutUntil = dbData.adminLockoutUntil ?? 0;

    const now = Date.now();
    if (lockoutUntil > now) {
      const waitSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { success: false, error: `Too many failed login attempts. Please wait ${waitSeconds} seconds.` };
    }

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
      // Reset lockout — only update lockout fields, not entire database
      await supabase.from('site_settings').upsert([
        { key: 'adminFailedAttempts', value: 0 },
        { key: 'adminLockoutUntil', value: 0 },
      ]);

      const token = crypto.randomBytes(32).toString('hex');
      await saveAdminToken(token);
      return { success: true, token };
    }

    const nextAttempts = failedAttempts + 1;

    if (nextAttempts >= 5) {
      // Save lockout — only update lockout fields, not entire database
      await supabase.from('site_settings').upsert([
        { key: 'adminFailedAttempts', value: nextAttempts },
        { key: 'adminLockoutUntil', value: now + 60000 },
      ]);
      return { success: false, error: 'Incorrect administrator password. Device blocked for 60 seconds.' };
    }

    // Save failed attempt — only update failed attempts field
    await supabase.from('site_settings').upsert([
      { key: 'adminFailedAttempts', value: nextAttempts },
    ]);
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
      await supabase.from('members').update({ password: hashed }).eq('id', member.id);
    }

    const { password, ...safeMember } = member;
    return { success: true, member: safeMember as Member };
  }
}