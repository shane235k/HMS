// apps/api/src/modules/management/management.controller.ts
import { Request, Response, NextFunction } from 'express';
import { managementService } from './management.service';

export class ManagementController {
  async getMyHotel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await managementService.getManagedHotel(
        req.user!.userId,
        (req as any).resolvedHotelId
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateHotel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await managementService.updateHotelProfile(req.user!.userId, req.body, req.ip);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      // Hotel ID is resolved from propertyGuard or managed hotel
      const hotelId = (req as any).resolvedHotelId;
      const result = await managementService.listStaff(hotelId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const result = await managementService.createStaffMember(
        req.user!.userId,
        hotelId,
        req.body,
        req.ip
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStaffStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const result = await managementService.updateStaffStatus(
        hotelId,
        req.params.id,
        req.body,
        req.user!.userId,
        req.ip
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOperationsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const dateStr = req.query.date as string | undefined;
      const report = await managementService.getDailyOperationsReport(hotelId, dateStr);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const managementController = new ManagementController();

