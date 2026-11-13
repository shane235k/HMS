// apps/api/src/modules/reception/reception.routes.ts
import { Router } from 'express';
import { receptionController } from './reception.controller';
import { authenticate, requireRoles } from '../../common/middleware/auth';
import { requirePropertyScope } from '../../common/middleware/propertyGuard';
import { validate } from '../../common/middleware/validate';
import {
  Role,
  assignRoomSchema,
  reassignRoomSchema,
  releaseRoomAssignmentSchema,
  walkInBookingSchema,
} from '@hbms/shared';

const router = Router();

// Staff role requirement: HOTEL_MANAGER, RECEPTIONIST or PLATFORM_ADMIN
router.use(authenticate);
router.use(requireRoles([Role.HOTEL_MANAGER, Role.RECEPTIONIST, Role.PLATFORM_ADMIN]));
router.use(requirePropertyScope());

// Operational Views
router.get('/arrivals', (req, res, next) => receptionController.getArrivals(req, res, next));
router.get('/departures', (req, res, next) => receptionController.getDepartures(req, res, next));
router.get('/in-house', (req, res, next) => receptionController.getInHouse(req, res, next));
router.get('/search', (req, res, next) => receptionController.search(req, res, next));
router.get('/calendar-schedule', (req, res, next) =>
  receptionController.getCalendarSchedule(req, res, next)
);

// Room Assignment & Slot Management
router.post(
  '/reservations/:id/assign',
  validate(assignRoomSchema),
  (req, res, next) => receptionController.assignRoom(req, res, next)
);

router.post(
  '/reservations/:id/reassign',
  validate(reassignRoomSchema),
  (req, res, next) => receptionController.reassignRoom(req, res, next)
);

router.post(
  '/reservations/:id/release',
  validate(releaseRoomAssignmentSchema),
  (req, res, next) => receptionController.releaseRoom(req, res, next)
);

// Check-in & Check-out execution
router.post('/reservations/:id/check-in', (req, res, next) =>
  receptionController.checkIn(req, res, next)
);

router.post('/reservations/:id/check-out', (req, res, next) =>
  receptionController.checkOut(req, res, next)
);

// Walk-in booking creation
router.post(
  '/walk-in',
  validate(walkInBookingSchema),
  (req, res, next) => receptionController.createWalkIn(req, res, next)
);

export default router;
