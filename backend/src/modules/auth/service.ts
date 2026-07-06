import { getDatabase, saveAdminToken, supabase } from '../../shared/utils/db.ts';
import { Member } from '../../shared/types/index.ts';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendMemberOtpEmail } from '../../shared/utils/email.service.ts';

// In-memory OTP store for member password reset — keyed by lowercased email.
// Mirrors the existing admin OTP pattern in modules/auth/otp.ts.
const memberResetOtps = new Map<string, { code: string; expires: number }>();

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

  // ── Step 1: request an OTP be emailed to the member ──────────────────────
  async requestMemberPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const data = await getDatabase();
    const member = data.members.find(m => m.email.toLowerCase().trim() === cleanEmail);

    // Always return success even if no account exists — avoids leaking
    // which emails are registered members.
    if (!member) {
      return { success: true };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    memberResetOtps.set(cleanEmail, { code, expires: Date.now() + 10 * 60 * 1000 });

    try {
      await sendMemberOtpEmail(member.email, member.name, code);
    } catch (err: any) {
      console.error('[Email] Member OTP send failed:', err.message);
      return { success: false, error: 'Failed to send OTP email. Please try again shortly.' };
    }

    return { success: true };
  }

  // ── Step 2: verify OTP + set new password in one call ────────────────────
  async resetMemberPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const entry = memberResetOtps.get(cleanEmail);

    if (!entry) {
      return { success: false, error: 'No OTP requested. Please request a new one.' };
    }
    if (Date.now() > entry.expires) {
      memberResetOtps.delete(cleanEmail);
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }
    if (code !== entry.code) {
      return { success: false, error: 'Incorrect OTP. Please try again.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const data = await getDatabase();
    const member = data.members.find(m => m.email.toLowerCase().trim() === cleanEmail);
    if (!member) {
      memberResetOtps.delete(cleanEmail);
      return { success: false, error: 'Member account not found.' };
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const { error } = await supabase.from('members').update({ password: hashed }).eq('id', member.id);

    memberResetOtps.delete(cleanEmail);

    if (error) {
      console.error('[DB] Failed to update member password:', error);
      return { success: false, error: 'Failed to update password. Please try again.' };
    }

    return { success: true };
  }
}