// apps/api/src/modules/reservations/reservations.routes.ts
import { Router } from 'express';
import { reservationsController } from './reservations.controller';
import { authenticate, optionalAuthenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  confirmReservationSchema,
  cancelReservationSchema,
  retryRefundSchema,
} from '@hbms/shared';

const router = Router();

// 1. Guest personal reservations portal
router.get('/my', authenticate, (req, res, next) =>
  reservationsController.listMy(req, res, next)
);

// 2. Reservation details lookup (by id or reservation_code)
router.get('/:id', optionalAuthenticate, (req, res, next) =>
  reservationsController.getById(req, res, next)
);

// 3. Confirm reservation & process payment
router.post(
  '/:id/confirm',
  authenticate,
  validate(confirmReservationSchema),
  (req, res, next) => reservationsController.confirm(req, res, next)
);

// 4. Cancellation preview (estimate eligible refund without cancelling)
router.get(
  '/:id/cancellation-preview',
  optionalAuthenticate,
  (req, res, next) => reservationsController.previewCancellation(req, res, next)
);

// 5. Cancel reservation & trigger refund
router.post(
  '/:id/cancel',
  optionalAuthenticate,
  validate(cancelReservationSchema),
  (req, res, next) => reservationsController.cancel(req, res, next)
);

// 6. Retry failed refund
router.post(
  '/:id/refund/retry',
  optionalAuthenticate,
  validate(retryRefundSchema),
  (req, res, next) => reservationsController.retryRefund(req, res, next)
);

export default router;

