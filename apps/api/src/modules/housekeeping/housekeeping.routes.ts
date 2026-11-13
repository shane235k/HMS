// apps/api/src/modules/housekeeping/housekeeping.routes.ts
import { Router } from 'express';
import { housekeepingController } from './housekeeping.controller';
import { authenticate, requireRoles } from '../../common/middleware/auth';
import { requirePropertyScope } from '../../common/middleware/propertyGuard';
import { validate } from '../../common/middleware/validate';
import {
  Role,
  assignHousekeepingTaskSchema,
  createMaintenanceIssueSchema,
  updateHousekeepingTaskStatusSchema,
} from '@hbms/shared';

const router = Router();

router.use(authenticate);
router.use(
  requireRoles([
    Role.HOTEL_MANAGER,
    Role.HOUSEKEEPING,
    Role.RECEPTIONIST,
    Role.PLATFORM_ADMIN,
  ])
);
router.use(requirePropertyScope());

// Dashboard and list views
router.get('/dashboard', (req, res, next) => housekeepingController.getDashboard(req, res, next));
router.get('/rooms', (req, res, next) => housekeepingController.getRooms(req, res, next));
router.get('/tasks', (req, res, next) => housekeepingController.getTasks(req, res, next));

// Task lifecycle transitions
router.post('/tasks/:id/start', (req, res, next) =>
  housekeepingController.startCleaning(req, res, next)
);

router.post(
  '/tasks/:id/submit-inspection',
  validate(updateHousekeepingTaskStatusSchema),
  (req, res, next) => housekeepingController.submitForInspection(req, res, next)
);

// Inspection approval: Requires supervisor / manager / front desk authorization
router.post(
  '/tasks/:id/approve-inspection',
  requireRoles([Role.HOTEL_MANAGER, Role.RECEPTIONIST, Role.PLATFORM_ADMIN]),
  (req, res, next) => housekeepingController.approveInspection(req, res, next)
);

router.post(
  '/tasks/:id/assign',
  validate(assignHousekeepingTaskSchema),
  (req, res, next) => housekeepingController.assignTask(req, res, next)
);

// Maintenance issues reporting and resolution
router.post(
  '/issues',
  validate(createMaintenanceIssueSchema),
  (req, res, next) => housekeepingController.reportMaintenance(req, res, next)
);

router.get('/issues', (req, res, next) =>
  housekeepingController.listMaintenance(req, res, next)
);

router.patch('/issues/:id/resolve', (req, res, next) =>
  housekeepingController.resolveMaintenance(req, res, next)
);

export default router;
