// apps/api/src/modules/hotels/hotels.routes.ts
import { Router } from 'express';
import { hotelsController } from './hotels.controller';
import { authenticate, optionalAuthenticate, requireRoles } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  availabilityQuerySchema,
  createHoldSchema,
  createReviewSchema,
  Role,
} from '@hbms/shared';

const router = Router();

// Public routes
router.get('/', (req, res, next) => hotelsController.listPublic(req, res, next));
router.get('/map', (req, res, next) => hotelsController.getMapGeoJSON(req, res, next));
router.get('/search', (req, res, next) => hotelsController.searchHotels(req, res, next));
router.get('/destinations', (req, res, next) => hotelsController.getMatchingDestinations(req, res, next));
router.get('/id/:id', (req, res, next) => hotelsController.getById(req, res, next));
router.get('/:id/rooms/:roomTypeId', (req, res, next) => hotelsController.getRoomType(req, res, next));
router.get('/:id/reviews', (req, res, next) => hotelsController.getReviews(req, res, next));
router.get(
  '/:id/review-eligibility',
  authenticate,
  (req, res, next) => hotelsController.checkReviewEligibility(req, res, next)
);
router.post(
  '/:id/reviews',
  authenticate,
  validate(createReviewSchema),
  (req, res, next) => hotelsController.createReview(req, res, next)
);
router.get('/:slug', (req, res, next) => hotelsController.getBySlug(req, res, next));

// Availability & Temporary Holds
router.get(
  '/:id/availability',
  validate(availabilityQuerySchema, 'query'),
  (req, res, next) => hotelsController.getAvailability(req, res, next)
);

router.post(
  '/:id/holds',
  authenticate,
  validate(createHoldSchema),
  (req, res, next) => hotelsController.createHold(req, res, next)
);

router.get(
  '/:id/holds/:code',
  (req, res, next) => hotelsController.getHold(req, res, next)
);

// Admin routes
router.get(
  '/admin/all',
  authenticate,
  requireRoles([Role.PLATFORM_ADMIN]),
  (req, res, next) => hotelsController.listAdmin(req, res, next)
);

router.patch(
  '/admin/:id/status',
  authenticate,
  requireRoles([Role.PLATFORM_ADMIN]),
  (req, res, next) => hotelsController.updateStatus(req, res, next)
);

export default router;
