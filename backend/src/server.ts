import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.ts';
import { initWhatsApp } from './shared/utils/whatsapp.service.ts';
import { startPaymentReminderScheduler } from './shared/utils/paymentReminderScheduler.ts'; // ← NEW
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
// CORS
 
// Only serve frontend static files in development
if (process.env.NODE_ENV !== 'production') {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
 
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
 
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[NEFC MODULAR BACKEND] Secure service listening on port ${PORT}`);
 
  // ── Start WhatsApp connection ─────────────────────────────────────────────
  // First run: a QR code prints in this terminal.
  // Scan it: WhatsApp app → ⋮ Menu → Linked Devices → Link a Device.
  // Session is saved to ./wa_auth_session — you won't need to scan again.
  try {
    await initWhatsApp();
    startPaymentReminderScheduler(); // ← NEW: starts the daily 9 AM reminder check
  } catch (err: any) {
    console.error('⚠️  WhatsApp init error (non-fatal, server still runs):', err.message);
  }
  // ─────────────────────────────────────────────────────────────────────────
});