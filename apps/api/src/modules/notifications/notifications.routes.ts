// apps/api/src/modules/notifications/notifications.routes.ts
import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../common/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => notificationsController.getMyNotifications(req, res, next));
router.patch('/read-all', (req, res, next) => notificationsController.markAllAsRead(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationsController.markAsRead(req, res, next));

export default router;

