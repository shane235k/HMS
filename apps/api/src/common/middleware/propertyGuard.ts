// apps/api/src/common/middleware/propertyGuard.ts
import { Request, Response, NextFunction } from 'express';
import { Role } from '@hbms/shared';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '../errors';
import { prisma } from '@hbms/database';

export type ResourceHotelResolver = (req: Request) => Promise<string | null>;

/**
 * Resolves the property associated with the target resource and verifies
 * that the authenticated user belongs to that property (or is a PLATFORM_ADMIN).
 */
export const requirePropertyScope = (resolver?: ResourceHotelResolver) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if an explicit hotel ID was targeted in headers, query, or params
      const explicitHotelId =
        (req.headers['x-hotel-id'] as string) ||
        (req.query.hotelId as string) ||
        req.params.hotelId;

      // Platform admins have global access
      if (user.role === Role.PLATFORM_ADMIN) {
        (req as any).resolvedHotelId = explicitHotelId || null;
        return next();
      }

      let targetHotelId: string | null = null;

      if (resolver) {
        // Resolve hotelId directly from database resource (e.g. room, staff, task)
        targetHotelId = await resolver(req);
        if (!targetHotelId) {
          throw new NotFoundError('Target resource or associated hotel not found');
        }
      } else if (explicitHotelId) {
        targetHotelId = explicitHotelId;
      } else {
        // Fallback: if user is manager, resolve their 1:1 assigned hotel
        if (user.role === Role.HOTEL_MANAGER) {
          const hotel = await prisma.hotel.findUnique({
            where: { manager_id: user.userId },
            select: { id: true },
          });
          if (!hotel) {
            throw new ForbiddenError('Manager is not assigned to any active hotel');
          }
          targetHotelId = hotel.id;
        } else if (user.role === Role.RECEPTIONIST || user.role === Role.HOUSEKEEPING) {
          const staff = await prisma.staffProfile.findUnique({
            where: { user_id: user.userId },
            select: { hotel_id: true, is_active: true },
          });
          if (!staff || !staff.is_active) {
            throw new ForbiddenError('Staff member has no active hotel assignment');
          }
          targetHotelId = staff.hotel_id;
        }
      }

      // Verify that user's authorized hotelId matches the target resource
      if (user.role === Role.HOTEL_MANAGER) {
        const managedHotel = await prisma.hotel.findUnique({
          where: { manager_id: user.userId },
          select: { id: true },
        });
        if (!managedHotel || managedHotel.id !== targetHotelId) {
          throw new ForbiddenError('Access denied: You are not authorized to manage this hotel');
        }
      } else if (user.role === Role.RECEPTIONIST || user.role === Role.HOUSEKEEPING) {
        const staff = await prisma.staffProfile.findUnique({
          where: { user_id: user.userId },
          select: { hotel_id: true, is_active: true },
        });
        if (!staff || !staff.is_active || staff.hotel_id !== targetHotelId) {
          throw new ForbiddenError('Access denied: Cross-property access violation');
        }
      } else {
        throw new ForbiddenError('Role not authorized for property-scoped operations');
      }

      // Attach resolved targetHotelId to request for downstream handlers
      (req as any).resolvedHotelId = targetHotelId;
      next();
    } catch (error) {
      next(error);
    }
  };
};

