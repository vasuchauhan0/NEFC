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
import backupRoutes from './modules/backup/routes.ts';
import otpRouter from './modules/auth/otp.ts';



const app: Express = express();

// Middlewares
// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Mirror the incoming origin back to allow dynamic preview/development origins
    if (!origin) {
      callback(null, true);
    } else {
      callback(null, origin);
    }
  },
  credentials: true,
}));

// API Prefix Routing mapping
app.use('/api', authRoutes);
app.use('/api', membersRoutes);
app.use('/api', schemesRoutes);
app.use('/api', contactRoutes);
app.use('/api', cmsRoutes);
app.use('/api', announcementRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', backupRoutes);
app.use('/api/otp', otpRouter);

export default app;
