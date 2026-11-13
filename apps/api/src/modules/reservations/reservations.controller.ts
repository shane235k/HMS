// apps/api/src/modules/reservations/reservations.controller.ts
import { Request, Response, NextFunction } from 'express';
import { reservationsService } from './reservations.service';

export class ReservationsController {
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const reservationId = req.params.id;
      const result = await reservationsService.confirmReservation(
        reservationId,
        req.body,
        req.user?.userId,
        req.user?.role,
        req.user?.hotelId || undefined
      );

      res.status(result.isReplay ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const reservationId = req.params.id;
      const guestEmail = req.query.email as string | undefined;

      const reservation = await reservationsService.getReservation(
        reservationId,
        guestEmail,
        req.user?.userId,
        req.user?.role,
        req.user?.hotelId || undefined
      );

      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMy(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const filter = (req.query.filter as any) || 'all';
      const reservations = await reservationsService.listMyReservations(
        req.user.userId,
        req.user.email,
        filter
      );

      res.status(200).json({
        success: true,
        data: reservations,
      });
    } catch (err) {
      next(err);
    }
  }

  async previewCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const reservationId = req.params.id;
      const preview = await reservationsService.previewCancellation(
        reservationId,
        req.user?.userId,
        req.user?.role,
        req.user?.hotelId || undefined
      );

      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const reservationId = req.params.id;
      const result = await reservationsService.cancelReservation(
        reservationId,
        req.body,
        req.user?.userId,
        req.user?.role,
        req.user?.hotelId || undefined
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async retryRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const reservationId = req.params.id;
      const result = await reservationsService.retryRefund(
        reservationId,
        req.body,
        req.user?.userId,
        req.user?.role,
        req.user?.hotelId || undefined
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reservationsController = new ReservationsController();
