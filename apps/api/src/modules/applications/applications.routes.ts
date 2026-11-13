// apps/api/src/modules/applications/applications.routes.ts
import { Router } from 'express';
import { applicationsController } from './applications.controller';
import { authenticate, requireRoles } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { hotelApplicationSchema, reviewApplicationSchema, Role } from '@hbms/shared';

const router = Router();

// Manager submits application
router.post(
  '/',
  authenticate,
  validate(hotelApplicationSchema),
  (req, res, next) => applicationsController.submit(req, res, next)
);

// Manager gets their own application
router.get(
  '/my',
  authenticate,
  (req, res, next) => applicationsController.getMine(req, res, next)
);

// Admin review queue
router.get(
  '/',
  authenticate,
  requireRoles([Role.PLATFORM_ADMIN]),
  (req, res, next) => applicationsController.list(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  requireRoles([Role.PLATFORM_ADMIN]),
  (req, res, next) => applicationsController.getById(req, res, next)
);

// Admin approves or rejects application
router.post(
  '/:id/review',
  authenticate,
  requireRoles([Role.PLATFORM_ADMIN]),
  validate(reviewApplicationSchema),
  (req, res, next) => applicationsController.review(req, res, next)
);

export default router;

