// apps/api/src/modules/admin/admin.routes.ts
import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, requireRoles } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { Role, updateHotelPlatformStatusSchema } from '@hbms/shared';

const router = Router();

router.use(authenticate);
router.use(requireRoles([Role.PLATFORM_ADMIN]));

router.get('/hotels', (req, res, next) => adminController.listHotels(req, res, next));
router.patch(
  '/hotels/:id/status',
  validate(updateHotelPlatformStatusSchema),
  (req, res, next) => adminController.updateHotelStatus(req, res, next)
);
router.get('/stats', (req, res, next) => adminController.getPlatformStats(req, res, next));
router.get('/audit-logs', (req, res, next) => adminController.listAuditLogs(req, res, next));

export default router;

