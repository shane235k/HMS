// apps/api/src/modules/management/inventory.controller.ts
import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';

export class InventoryController {
  // Room Types
  async listRoomTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.listRoomTypes(hotelId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.getRoomType(hotelId, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.createRoomType(hotelId, req.user!.userId, req.body, req.ip);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.updateRoomType(hotelId, req.params.id, req.user!.userId, req.body, req.ip);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateRoomTypeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.updateRoomTypeStatus(hotelId, req.params.id, req.body.isActive, req.user!.userId, req.ip);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Physical Rooms
  async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.listRooms(
        hotelId,
        req.query.roomTypeId as string,
        req.query.operationalStatus as any
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.getRoom(hotelId, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.createRoom(hotelId, req.user!.userId, req.body, req.ip);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.updateRoom(hotelId, req.params.id, req.user!.userId, req.body, req.ip);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateRoomOperationalStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.updateRoomOperationalStatus(
        hotelId,
        req.params.id,
        req.body.operationalStatus,
        req.user!.userId,
        req.ip
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Maintenance & Blocks
  async listBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.listRoomBlocks(hotelId, req.query.roomId as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createRoomBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.createRoomBlock(hotelId, req.params.id, req.user!.userId, req.body, req.ip);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.deleteRoomBlock(hotelId, req.params.id, req.user!.userId, req.ip);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Rate Plans
  async listRatePlans(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.listRatePlans(hotelId, req.query.roomTypeId as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.getRatePlan(hotelId, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createRatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.createRatePlan(hotelId, req.user!.userId, req.body, req.ip);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateRatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.updateRatePlan(hotelId, req.params.id, req.user!.userId, req.body, req.ip);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Rate Calendar Overrides
  async getRateCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.getRateCalendar(
        hotelId,
        req.params.id,
        req.query.startDate as string,
        req.query.endDate as string
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async setRateCalendarOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.setRateCalendarOverride(
        hotelId,
        req.params.id,
        req.body,
        req.user!.userId,
        req.ip
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async bulkSetRateCalendarOverrides(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = (req as any).resolvedHotelId;
      const data = await inventoryService.bulkSetRateCalendarOverrides(
        hotelId,
        req.params.id,
        req.body,
        req.user!.userId,
        req.ip
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();

