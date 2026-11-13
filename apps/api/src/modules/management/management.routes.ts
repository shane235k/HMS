// apps/api/src/modules/management/management.routes.ts
import { Router } from 'express';
import { managementController } from './management.controller';
import { inventoryController } from './inventory.controller';
import { authenticate, requireRoles } from '../../common/middleware/auth';
import { requirePropertyScope } from '../../common/middleware/propertyGuard';
import { validate } from '../../common/middleware/validate';
import {
  createStaffSchema,
  updateStaffStatusSchema,
  createRoomTypeSchema,
  updateRoomTypeSchema,
  createRoomSchema,
  updateRoomSchema,
  updateRoomOperationalStatusSchema,
  createRoomBlockSchema,
  createRatePlanSchema,
  updateRatePlanSchema,
  rateCalendarOverrideSchema,
  bulkRateCalendarOverrideSchema,
  Role,
} from '@hbms/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Role grouping constants
const STAFF_AND_MANAGEMENT_ROLES = [
  Role.HOTEL_MANAGER,
  Role.RECEPTIONIST,
  Role.HOUSEKEEPING,
  Role.PLATFORM_ADMIN,
];
const DESK_AND_MANAGEMENT_ROLES = [
  Role.HOTEL_MANAGER,
  Role.RECEPTIONIST,
  Role.PLATFORM_ADMIN,
];
const MANAGEMENT_ONLY_ROLES = [Role.HOTEL_MANAGER, Role.PLATFORM_ADMIN];

// Hotel Profile
router.get(
  '/property',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => managementController.getMyHotel(req, res, next)
);
router.put(
  '/property',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  (req, res, next) => managementController.updateHotel(req, res, next)
);

// Staff Management (enforcing property scope resolution)
router.get(
  '/staff',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  (req, res, next) => managementController.listStaff(req, res, next)
);

router.post(
  '/staff',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(createStaffSchema),
  (req, res, next) => managementController.createStaff(req, res, next)
);

router.patch(
  '/staff/:id/status',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateStaffStatusSchema),
  (req, res, next) => managementController.updateStaffStatus(req, res, next)
);

// Daily Operations & Occupancy Reporting
router.get(
  '/reports/daily',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  (req, res, next) => managementController.getOperationsReport(req, res, next)
);

// ====================================================
// MILESTONE 2: INVENTORY & RATE MANAGEMENT
// ====================================================

// 1. Room Types
router.get(
  '/room-types',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.listRoomTypes(req, res, next)
);

router.get(
  '/room-types/:id',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.getRoomType(req, res, next)
);

router.post(
  '/room-types',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(createRoomTypeSchema),
  (req, res, next) => inventoryController.createRoomType(req, res, next)
);

router.put(
  '/room-types/:id',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateRoomTypeSchema),
  (req, res, next) => inventoryController.updateRoomType(req, res, next)
);

router.patch(
  '/room-types/:id',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateRoomTypeSchema),
  (req, res, next) => inventoryController.updateRoomType(req, res, next)
);

router.patch(
  '/room-types/:id/status',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateRoomTypeSchema),
  (req, res, next) => inventoryController.updateRoomTypeStatus(req, res, next)
);

// 2. Physical Rooms
router.get(
  '/rooms',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.listRooms(req, res, next)
);

router.get(
  '/rooms/:id',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.getRoom(req, res, next)
);

router.post(
  '/rooms',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(createRoomSchema),
  (req, res, next) => inventoryController.createRoom(req, res, next)
);

router.put(
  '/rooms/:id',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateRoomSchema),
  (req, res, next) => inventoryController.updateRoom(req, res, next)
);

router.patch(
  '/rooms/:id/status',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  validate(updateRoomOperationalStatusSchema),
  (req, res, next) => inventoryController.updateRoomOperationalStatus(req, res, next)
);

// 3. Maintenance Date Blocks
router.get(
  '/blocks',
  requirePropertyScope(),
  requireRoles(STAFF_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.listBlocks(req, res, next)
);

router.post(
  '/rooms/:id/blocks',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  validate(createRoomBlockSchema),
  (req, res, next) => inventoryController.createRoomBlock(req, res, next)
);

router.delete(
  '/blocks/:id',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.deleteBlock(req, res, next)
);

// 4. Rate Plans
router.get(
  '/rate-plans',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.listRatePlans(req, res, next)
);

router.get(
  '/rate-plans/:id',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.getRatePlan(req, res, next)
);

router.post(
  '/rate-plans',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(createRatePlanSchema),
  (req, res, next) => inventoryController.createRatePlan(req, res, next)
);

router.put(
  '/rate-plans/:id',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(updateRatePlanSchema),
  (req, res, next) => inventoryController.updateRatePlan(req, res, next)
);

// 5. Rate Calendar Overrides
router.get(
  '/rate-plans/:id/calendar',
  requirePropertyScope(),
  requireRoles(DESK_AND_MANAGEMENT_ROLES),
  (req, res, next) => inventoryController.getRateCalendar(req, res, next)
);

router.post(
  '/rate-plans/:id/calendar',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(rateCalendarOverrideSchema),
  (req, res, next) => inventoryController.setRateCalendarOverride(req, res, next)
);

router.post(
  '/rate-plans/:id/calendar/bulk',
  requirePropertyScope(),
  requireRoles(MANAGEMENT_ONLY_ROLES),
  validate(bulkRateCalendarOverrideSchema),
  (req, res, next) => inventoryController.bulkSetRateCalendarOverrides(req, res, next)
);

export default router;
