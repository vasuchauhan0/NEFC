import express, { Express } from 'express';
import cors from 'cors';
import 'dotenv/config';


// Import Modular Routes
import authRoutes from './modules/auth/routes.ts';
import membersRoutes from './modules/members/routes.ts';
import schemesRoutes from './modules/schemes/routes.ts';
import contactRoutes from './modules/contact/routes.ts';
import cmsRoutes from './modules/cms/routes.ts';
import announcementRoutes from './modules/announcements/routes.ts';
import dashboardRoutes from './modules/dashboard/routes.ts';
import notificationsRoutes from './modules/notifications/routes.ts';   // ← added
import otpRouter from './modules/auth/otp.ts';



const app: Express = express();

app.set('trust proxy', true);

// Middlewares
// Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://nefc-ten.vercel.app',
    'https://nefc.online',
    'https://www.nefc.online',
  ],
  credentials: true,
}));
app.use(express.json());


// API Prefix Routing mapping
app.use('/api', authRoutes);
app.use('/api', membersRoutes);
app.use('/api', schemesRoutes);
app.use('/api', contactRoutes);
app.use('/api', cmsRoutes);
app.use('/api', announcementRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', notificationsRoutes);   // ← added
app.use('/api/otp', otpRouter);

export default app;