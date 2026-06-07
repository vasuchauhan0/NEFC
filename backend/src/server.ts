import 'dotenv/config';
import app from './app.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEFC MODULAR BACKEND] Secure service listening on port ${PORT}`);
});