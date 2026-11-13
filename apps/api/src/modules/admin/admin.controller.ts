// apps/api/src/modules/admin/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { HotelStatus } from '@hbms/shared';

export class AdminController {
  async listHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const hotels = await adminService.listHotels();
      res.status(200).json({ success: true, data: hotels });
    } catch (err) {
      next(err);
    }
  }

  async updateHotelStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const { status, reason } = req.body;
      const updated = await adminService.updateHotelStatus(
        hotelId,
        status as HotelStatus,
        req.user!.userId,
        reason,
        req.ip
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getGlobalPlatformStats();
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await adminService.listAuditLogs(limit);
      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();

