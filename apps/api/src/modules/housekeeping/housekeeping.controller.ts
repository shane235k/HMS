// apps/api/src/modules/housekeeping/housekeeping.controller.ts
import { Request, Response, NextFunction } from 'express';
import { housekeepingService } from './housekeeping.service';
import { OperationalStatus, TaskStatus, MaintenanceStatus } from '@hbms/shared';

export class HousekeepingController {
  private getHotelId(req: Request): string {
    return (req as any).resolvedHotelId || req.user?.hotelId;
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const metrics = await housekeepingService.getDashboard(hotelId);
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const status = req.query.status as OperationalStatus | undefined;
      const floor = req.query.floor ? parseInt(req.query.floor as string, 10) : undefined;
      const rooms = await housekeepingService.getRooms(hotelId, status, floor);
      res.status(200).json({ success: true, data: rooms });
    } catch (err) {
      next(err);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const status = req.query.status as TaskStatus | undefined;
      const staffId = req.query.staffId as string | undefined;
      const tasks = await housekeepingService.getTasks(hotelId, status, staffId);
      res.status(200).json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  }

  async startCleaning(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const taskId = req.params.id;
      const result = await housekeepingService.startCleaning(hotelId, taskId, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async submitForInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const taskId = req.params.id;
      const notes = req.body.notes;
      const result = await housekeepingService.submitForInspection(hotelId, taskId, notes);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async approveInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const taskId = req.params.id;
      const result = await housekeepingService.approveInspection(
        hotelId,
        taskId,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async assignTask(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const taskId = req.params.id;
      const assignedToId = req.body.assignedToId;
      const result = await housekeepingService.assignTask(hotelId, taskId, assignedToId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async reportMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = this.getHotelId(req);
      const result = await housekeepingService.reportMaintenanceIssue(
        hotelId,
        req.body,
        req.user?.userId
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async listMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.user!.hotelId!;
      const status = req.query.status as MaintenanceStatus | undefined;
      const issues = await housekeepingService.listMaintenanceIssues(hotelId, status);
      res.status(200).json({ success: true, data: issues });
    } catch (err) {
      next(err);
    }
  }

  async resolveMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.user!.hotelId!;
      const issueId = req.params.id;
      const result = await housekeepingService.resolveMaintenanceIssue(
        hotelId,
        issueId,
        req.user?.userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const housekeepingController = new HousekeepingController();
