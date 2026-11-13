// apps/api/src/modules/reception/reception.controller.ts
import { Request, Response, NextFunction } from 'express';
import { receptionService } from './reception.service';

export class ReceptionController {
  private getHotelId(req: Request): string {
    return (req as any).resolvedHotelId || req.user?.hotelId;
  }

  async getArrivals(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const dateStr = req.query.date as string | undefined;
      const arrivals = await receptionService.getArrivals(hotelId, dateStr);
      res.status(200).json({ success: true, data: arrivals });
    } catch (err) {
      next(err);
    }
  }

  async getDepartures(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const dateStr = req.query.date as string | undefined;
      const departures = await receptionService.getDepartures(hotelId, dateStr);
      res.status(200).json({ success: true, data: departures });
    } catch (err) {
      next(err);
    }
  }

  async getInHouse(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const inHouse = await receptionService.getInHouse(hotelId);
      res.status(200).json({ success: true, data: inHouse });
    } catch (err) {
      next(err);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const query = (req.query.q as string) || '';
      const results = await receptionService.searchReservations(hotelId, query);
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  async getCalendarSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const monthStr = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const schedule = await receptionService.getCalendarSchedule(hotelId, monthStr);
      res.status(200).json({ success: true, data: schedule });
    } catch (err) {
      next(err);
    }
  }

  async assignRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const reservationId = req.params.id;
      const assignment = await receptionService.assignRoom(
        hotelId,
        reservationId,
        req.body,
        req.user?.userId
      );
      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }

  async reassignRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const reservationId = req.params.id;
      const assignment = await receptionService.reassignRoom(
        hotelId,
        reservationId,
        req.body,
        req.user?.userId
      );
      res.status(200).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }

  async releaseRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const reservationId = req.params.id;
      const result = await receptionService.releaseRoomAssignment(
        hotelId,
        reservationId,
        req.body,
        req.user?.userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const reservationId = req.params.id;
      const result = await receptionService.checkIn(hotelId, reservationId, req.user?.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const reservationId = req.params.id;
      const result = await receptionService.checkOut(hotelId, reservationId, req.user?.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createWalkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const result = await receptionService.createWalkIn(hotelId, req.body, req.user?.userId);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const receptionController = new ReceptionController();
