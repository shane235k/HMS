// apps/api/src/modules/hotels/hotels.controller.ts
import { Request, Response, NextFunction } from 'express';
import { hotelsService, getStableHotelCoverImage } from './hotels.service';
import { availabilityService } from './availability.service';
import { HotelStatus } from '@hbms/shared';
import { prisma } from '@hbms/database';
import { NotFoundError } from '../../common/errors';

export class HotelsController {
  async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const city = req.query.city as string | undefined;

      if (req.query.format === 'geojson') {
        const geojson = await hotelsService.getHotelsGeoJSON(category, city);
        res.status(200).json(geojson);
        return;
      }

      const result = await hotelsService.listApprovedHotels(category, city);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMapGeoJSON(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const city = req.query.city as string | undefined;
      const result = await hotelsService.getHotelsGeoJSON(category, city);

      if (req.query.format === 'geojson') {
        res.status(200).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const destination = (req.query.destination || req.query.city) as string | undefined;
      const checkInDate = req.query.checkInDate as string | undefined;
      const checkOutDate = req.query.checkOutDate as string | undefined;
      const rawGuests = req.query.guests as string | undefined;
      const rawRooms = req.query.rooms as string | undefined;
      const isAll =
        rawGuests === 'all' ||
        rawRooms === 'all' ||
        rawGuests === '0' ||
        rawRooms === '0' ||
        req.query.all === 'true';
      const guests = isAll ? 'all' : (rawGuests ? parseInt(rawGuests, 10) : 2);
      const rooms = isAll ? 'all' : (rawRooms ? parseInt(rawRooms, 10) : 1);
      const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
      const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
      const starRating = req.query.starRating
        ? (req.query.starRating as string).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
        : undefined;
      const category = req.query.category
        ? (req.query.category as string).split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
        : undefined;
      const amenities = req.query.amenities
        ? (req.query.amenities as string).split(',').map((a) => a.trim()).filter(Boolean)
        : undefined;
      const sort = (req.query.sort as any) || 'recommended';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;

      const result = await hotelsService.searchHotels({
        destination,
        checkInDate,
        checkOutDate,
        guests,
        rooms,
        isAll,
        minPrice,
        maxPrice,
        starRating,
        category,
        amenities,
        sort,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMatchingDestinations(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string | undefined;
      const result = await hotelsService.getMatchingDestinations(q);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hotelsService.getHotelBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const hotel = await prisma.hotel.findUnique({
        where: { id: req.params.id },
        include: {
          room_types: {
            where: { is_active: true },
            include: {
              rate_plans: { where: { is_active: true } },
            },
          },
        },
      });

      if (!hotel || hotel.status !== HotelStatus.ACTIVE) {
        throw new NotFoundError('Hotel not found or is currently inactive');
      }

      const reviews = await prisma.review.findMany({
        where: { hotel_id: hotel.id },
        select: { rating: true },
      });
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : null;

      const coverImage = getStableHotelCoverImage(hotel);
      const images = hotel.images && hotel.images.length > 0 ? hotel.images : [coverImage];

      res.status(200).json({
        success: true,
        data: {
          ...hotel,
          coverImage,
          images,
          totalReviews,
          averageRating,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async listAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hotelsService.listAllHotelsForAdmin();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body.status as HotelStatus;
      const result = await hotelsService.updateHotelStatus(
        req.params.id,
        status,
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

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { checkInDate, checkOutDate, guests, rooms } = req.query as any;
      const isAll =
        guests === 'all' ||
        rooms === 'all' ||
        guests === '0' ||
        rooms === '0' ||
        req.query.all === 'true';
      const parsedGuests = isAll || !guests || isNaN(parseInt(guests, 10)) ? 1 : parseInt(guests, 10);
      const parsedRooms = isAll || !rooms || isNaN(parseInt(rooms, 10)) ? 1 : parseInt(rooms, 10);
      const result = await availabilityService.calculateAvailability(
        req.params.id,
        checkInDate,
        checkOutDate,
        parsedGuests,
        parsedRooms
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createHold(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await availabilityService.createTemporaryHold(
        req.params.id,
        req.body,
        (req as any).user?.userId
      );
      const statusCode = result.isReplay ? 200 : 201;
      res.status(statusCode).json({
        success: true,
        isReplay: result.isReplay,
        data: result.reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHold(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await prisma.reservation.findUnique({
        where: {
          reservation_code: req.params.code,
          hotel_id: req.params.id,
        },
        include: {
          rooms: {
            include: {
              room_type: true,
              rate_plan: true,
            },
          },
        },
      });
      if (!result) {
        throw new NotFoundError('Hold reservation not found');
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const roomTypeId = req.params.roomTypeId;
      const checkInDate = req.query.checkInDate as string | undefined;
      const checkOutDate = req.query.checkOutDate as string | undefined;
      const rawGuests = req.query.guests as string | undefined;
      const rawRooms = req.query.rooms as string | undefined;
      const guests =
        rawGuests && rawGuests !== 'all' && !isNaN(parseInt(rawGuests, 10))
          ? parseInt(rawGuests, 10)
          : 2;
      const rooms =
        rawRooms && rawRooms !== 'all' && !isNaN(parseInt(rawRooms, 10))
          ? parseInt(rawRooms, 10)
          : 1;

      const result = await hotelsService.getRoomTypeDetails(
        hotelId,
        roomTypeId,
        checkInDate,
        checkOutDate,
        guests,
        rooms
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const roomTypeId = req.query.roomTypeId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const result = await hotelsService.getHotelReviews(hotelId, roomTypeId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async checkReviewEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const userId = (req as any).user?.userId;
      const result = await hotelsService.checkReviewEligibility(hotelId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const userId = (req as any).user?.userId;
      const result = await hotelsService.createReview(hotelId, userId, req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const hotelsController = new HotelsController();
