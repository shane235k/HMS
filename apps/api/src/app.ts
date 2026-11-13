// apps/api/src/app.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './common/middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import applicationRoutes from './modules/applications/applications.routes';
import managementRoutes from './modules/management/management.routes';
import hotelRoutes from './modules/hotels/hotels.routes';
import reservationRoutes from './modules/reservations/reservations.routes';
import receptionRoutes from './modules/reception/reception.routes';
import housekeepingRoutes from './modules/housekeeping/housekeeping.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

export const createApp = (): Application => {
  const app = express();

  // Security & utility middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:3000'],
      credentials: true,
    })
  );
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'HBMS API',
      version: '1.0.0',
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/management', managementRoutes);
  app.use('/api/v1/hotels', hotelRoutes);
  app.use('/api/v1/reservations', reservationRoutes);
  app.use('/api/v1/reception', receptionRoutes);
  app.use('/api/v1/housekeeping', housekeepingRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

