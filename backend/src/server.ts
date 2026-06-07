import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount production static files
const distPath = path.resolve(__dirname, '../../dist');

app.use(express.static(distPath));

// Fallback all unspecified navigation routes back to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEFC MODULAR BACKEND] Secure service listening on port ${PORT}`);
});
