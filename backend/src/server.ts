import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';          // ADD THIS LINE
import app from './app.ts';
import 'dotenv/config';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS — allow frontend to call this backend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',   // replace this after Vercel deploy
  ],
  credentials: true,
}));

// Mount production static files
const distPath = path.resolve(__dirname, '../../dist');

app.use(express.static(distPath));

// Fallback all unspecified navigation routes back to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEFC MODULAR BACKEND] Secure service listening on port ${PORT}`);
});
