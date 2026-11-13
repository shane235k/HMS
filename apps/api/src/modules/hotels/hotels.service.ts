// apps/api/src/modules/hotels/hotels.service.ts
import { prisma } from '@hbms/database';
import {
  HotelStatus,
  ReservationStatus,
  Role,
  HotelGeoJsonCollection,
  HotelGeoJsonFeature,
  DetailedRoomType,
  ReviewSummary,
} from '@hbms/shared';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/errors';
import { logAuditEvent } from '../../common/utils/audit';
import { availabilityService } from './availability.service';

export interface HotelSearchParams {
  destination?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number | string;
  rooms?: number | string;
  isAll?: boolean;
  minPrice?: number; // in cents
  maxPrice?: number; // in cents
  starRating?: number[];
  category?: string[];
  amenities?: string[];
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc';
  page?: number;
  limit?: number;
}

const DEFAULT_HOTEL_IMAGES: Record<string, string> = {
  'Le Grand Luxe Paris': '/images/rooms/paris-royal-suite-1.webp',
  'Sakura Boutique Hotel Tokyo': '/images/rooms/tokyo-hinoki-penthouse-1.webp',
  'Sakura Onsen & Ryokan Tokyo': '/images/rooms/tokyo-hinoki-penthouse-1.webp',
  'Azure Haven Resort': '/images/rooms/bali-cliff-villa-1.webp',
  'Azure Haven Beach Resort': '/images/rooms/bali-cliff-villa-1.webp',
  'The Manhattan Executive Suites': '/images/rooms/ny-empire-suite-1.webp',
  'The Manhattan Executive Tower': '/images/rooms/ny-empire-suite-1.webp',
  'Emirates Mirage Palace': '/images/rooms/dubai-royal-penthouse-1.webp',
};

export function getStableHotelCoverImage(hotel: {
  id?: string;
  name: string;
  images?: string[];
  category?: string;
}): string {
  if (hotel.images && hotel.images.length > 0 && hotel.images[0]) {
    return hotel.images[0];
  }
  if (DEFAULT_HOTEL_IMAGES[hotel.name]) {
    return DEFAULT_HOTEL_IMAGES[hotel.name];
  }
  return '/images/homepage/hotel-modern-facade.webp';
}

export class HotelsService {
  async listApprovedHotels(category?: string, city?: string) {
    const hotels = await prisma.hotel.findMany({
      where: {
        status: HotelStatus.ACTIVE,
        category: category ? (category as any) : undefined,
        city: city ? { contains: city, mode: 'insensitive' } : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        star_rating: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postal_code: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
        status: true,
        check_in_time: true,
        check_out_time: true,
        images: true,
        reviews: {
          select: { rating: true },
        },
        _count: {
          select: { rooms: true, room_types: true, reviews: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return hotels.map((h) => {
      const totalReviews = h.reviews?.length || 0;
      const guestRating =
        totalReviews > 0
          ? Number((h.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
          : null;

      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        category: h.category,
        starRating: h.star_rating,
        star_rating: h.star_rating,
        guestRating,
        totalReviews,
        address: h.address,
        city: h.city,
        state: h.state,
        country: h.country,
        postalCode: h.postal_code,
        latitude: h.latitude,
        longitude: h.longitude,
        phone: h.phone,
        email: h.email,
        status: h.status,
        checkInTime: h.check_in_time,
        checkOutTime: h.check_out_time,
        images: h.images && h.images.length > 0 ? h.images : [getStableHotelCoverImage(h)],
      };
    });
  }

  async getHotelsGeoJSON(category?: string, city?: string): Promise<HotelGeoJsonCollection> {
    const hotels = await prisma.hotel.findMany({
      where: {
        status: HotelStatus.ACTIVE,
        category: category ? (category as any) : undefined,
        city: city ? { contains: city, mode: 'insensitive' } : undefined,
      },
      include: {
        room_types: {
          where: { is_active: true },
          select: {
            rate_plans: {
              where: { is_active: true },
              select: { base_price_cents: true },
            },
          },
        },
        _count: {
          select: { rooms: true, reviews: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const features: HotelGeoJsonFeature[] = hotels.map((hotel) => {
      let startingPrice = 0;
      const rates: number[] = [];
      for (const rt of hotel.room_types) {
        for (const rp of rt.rate_plans) {
          if (rp.base_price_cents > 0) rates.push(rp.base_price_cents);
        }
      }
      if (rates.length > 0) {
        startingPrice = Math.min(...rates);
      }

      return {
        type: 'Feature',
        id: hotel.id,
        geometry: {
          type: 'Point',
          coordinates: [hotel.longitude, hotel.latitude],
        },
        properties: {
          id: hotel.id,
          name: hotel.name,
          slug: hotel.slug,
          category: hotel.category as any,
          star_rating: hotel.star_rating,
          address: hotel.address,
          city: hotel.city,
          state: hotel.state,
          country: hotel.country,
          postal_code: hotel.postal_code,
          phone: hotel.phone,
          email: hotel.email,
          currency: hotel.currency || 'INR',
          starting_price_cents: startingPrice,
          total_rooms: hotel._count?.rooms || 0,
          reviews_count: hotel._count?.reviews || 0,
          check_in_time: hotel.check_in_time,
          check_out_time: hotel.check_out_time,
          description: hotel.description,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async getHotelBySlug(slug: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      include: {
        room_types: {
          where: { is_active: true },
          include: {
            rate_plans: {
              where: { is_active: true },
            },
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

    const images =
      hotel.images && hotel.images.length > 0 ? hotel.images : [getStableHotelCoverImage(hotel)];

    return {
      ...hotel,
      images,
      totalReviews,
      averageRating,
    };
  }

  async listAllHotelsForAdmin() {
    return prisma.hotel.findMany({
      include: {
        manager: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { rooms: true, staff: true, reservations: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateHotelStatus(hotelId: string, status: HotelStatus, adminUserId: string, ipAddress?: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: { status },
    });

    await logAuditEvent({
      hotelId,
      actorId: adminUserId,
      actorRole: Role.PLATFORM_ADMIN,
      action: `HOTEL_STATUS_${status}`,
      entityType: 'Hotel',
      entityId: hotelId,
      newState: { status },
      ipAddress,
    });

    return updated;
  }

  /**
   * Retrieves matching locations, cities, states, countries, and hotel names
   * directly from active hotels in the database.
   */
  async getMatchingDestinations(query?: string) {
    const hotels = await prisma.hotel.findMany({
      where: {
        status: HotelStatus.ACTIVE,
        rooms: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        country: true,
        address: true,
        latitude: true,
        longitude: true,
        category: true,
        star_rating: true,
      },
      orderBy: { name: 'asc' },
    });

    const q = (query || '').trim().toLowerCase();
    const qTokens = q
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const matchesText = (target: string | null | undefined): boolean => {
      if (!target) return false;
      if (!q) return true;
      const lower = target.toLowerCase();
      if (lower.includes(q) || q.includes(lower)) return true;
      return qTokens.some((tok) => lower.includes(tok) || tok.includes(lower));
    };

    const results: Array<{
      type: 'location' | 'hotel';
      name: string;
      label: string;
      city: string;
      state?: string;
      country: string;
      hotelId?: string;
      hotelSlug?: string;
      category?: string;
      starRating?: number;
      latitude?: number;
      longitude?: number;
    }> = [];

    const seenLabels = new Set<string>();

    // 1. Collect distinct city & destination matches
    for (const h of hotels) {
      const cityKey = `${h.city.toLowerCase()}|${h.country.toLowerCase()}`;
      const isMatch = matchesText(h.city) || matchesText(h.state) || matchesText(h.country);

      if (isMatch && !seenLabels.has(cityKey)) {
        seenLabels.add(cityKey);
        results.push({
          type: 'location',
          name: h.city,
          label: `${h.city}, ${h.state && h.state !== h.city ? `${h.state}, ` : ''}${h.country}`,
          city: h.city,
          state: h.state,
          country: h.country,
          latitude: h.latitude,
          longitude: h.longitude,
        });
      }
    }

    // 2. Collect distinct hotel property matches
    for (const h of hotels) {
      const hotelKey = `hotel-${h.id}`;
      const isMatch = matchesText(h.name) || matchesText(h.address);

      if (isMatch && !seenLabels.has(hotelKey)) {
        seenLabels.add(hotelKey);
        results.push({
          type: 'hotel',
          name: h.name,
          label: `${h.name} — ${h.city}, ${h.country}`,
          city: h.city,
          state: h.state,
          country: h.country,
          hotelId: h.id,
          hotelSlug: h.slug,
          category: h.category,
          starRating: h.star_rating,
          latitude: h.latitude,
          longitude: h.longitude,
        });
      }
    }

    return results;
  }

  async searchHotels(params: HotelSearchParams) {
    const {
      destination,
      checkInDate,
      checkOutDate,
      guests = 2,
      rooms = 1,
      minPrice,
      maxPrice,
      starRating,
      category,
      amenities,
      sort = 'recommended',
      page = 1,
      limit = 6,
    } = params;

    const isAll =
      params.isAll === true ||
      String(guests).toLowerCase() === 'all' ||
      String(rooms).toLowerCase() === 'all' ||
      guests === 0 ||
      rooms === 0;

    const numGuests = isAll || isNaN(Number(guests)) || Number(guests) < 1 ? 1 : Number(guests);
    const numRooms = isAll || isNaN(Number(rooms)) || Number(rooms) < 1 ? 1 : Number(rooms);

    const whereClause: any = {
      status: HotelStatus.ACTIVE,
      rooms: {
        some: {},
      },
    };

    if (destination && destination.trim()) {
      const q = destination.trim();
      const stopWords = new Set(['hotel', 'hotels', 'in', 'at', 'near', 'the', 'for', 'and', 'of', 'a']);
      const tokens = q
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((t) => t.length >= 2 && !stopWords.has(t));

      const orConditions: any[] = [
        // Exact substring matches
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];

      // Multi-word and token matches (e.g. "New Delhi" matches "Delhi", "Hotel in Bali" matches "Bali")
      for (const token of tokens) {
        orConditions.push(
          { city: { contains: token, mode: 'insensitive' } },
          { state: { contains: token, mode: 'insensitive' } },
          { country: { contains: token, mode: 'insensitive' } },
          { name: { contains: token, mode: 'insensitive' } },
          { address: { contains: token, mode: 'insensitive' } }
        );
      }

      whereClause.OR = orConditions;
    }

    if (category && category.length > 0) {
      whereClause.category = { in: category };
    }

    if (starRating && starRating.length > 0) {
      whereClause.star_rating = { in: starRating };
    }

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
      include: {
        room_types: {
          where: { is_active: true },
          include: {
            rate_plans: {
              where: { is_active: true },
            },
            rooms: {
              where: { is_active: true },
              select: { id: true, operational_status: true },
            },
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const hasDates =
      Boolean(checkInDate && checkOutDate) &&
      new Date(checkInDate!).getTime() < new Date(checkOutDate!).getTime();

    const processedHotels: any[] = [];

    for (let idx = 0; idx < hotels.length; idx++) {
      const hotel = hotels[idx];
      let startingPriceCents = 0;
      let totalStayPriceCents = 0;
      let availableRoomTypesCount = 0;
      let totalAvailableRooms = 0;
      let isAvailable = true;

      // Extract all amenities across room types
      const allHotelAmenities = Array.from(
        new Set(hotel.room_types.flatMap((rt) => rt.amenities || []))
      );

      // Add standard amenities if empty
      if (allHotelAmenities.length === 0) {
        allHotelAmenities.push('Wi-Fi', 'Room Service', 'Air Conditioning', 'Flat-screen TV');
      }

      if (hasDates) {
        try {
          const avail = await availabilityService.calculateAvailability(
            hotel.id,
            checkInDate!,
            checkOutDate!,
            numGuests,
            numRooms
          );

          // Find room types that meet requestedRooms and capacity (or all available if isAll)
          const suitableRoomTypes = isAll
            ? avail.roomTypes.filter((rt) => rt.availableQuantity >= 1)
            : avail.roomTypes.filter(
                (rt) => rt.availableQuantity >= numRooms && rt.maxGuests >= numGuests
              );

          if (suitableRoomTypes.length === 0) {
            // Per requirement: "Display only hotels with suitable available inventory for the requested stay."
            continue;
          }

          availableRoomTypesCount = suitableRoomTypes.length;
          totalAvailableRooms = suitableRoomTypes.reduce((acc, rt) => acc + rt.availableQuantity, 0);

          // Collect all available room packages & rates for this stay
          const packages: Array<{ nightlyPrice: number; totalPrice: number; roomTypeName: string }> = [];
          for (const rt of suitableRoomTypes) {
            for (const rp of rt.ratePlans) {
              if (rp.isAvailable && rp.totalCents > 0) {
                const nightlyPrice = Math.round(rp.totalCents / avail.totalNights);
                packages.push({
                  nightlyPrice,
                  totalPrice: rp.totalCents,
                  roomTypeName: rt.name,
                });
              }
            }
          }

          if (packages.length === 0) {
            isAvailable = false;
            continue;
          }

          // Context-aware budget matching:
          // Check if any room packages meet the user's budget range [minPrice, maxPrice]
          const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
          let matchingPackages = packages;
          if (hasPriceFilter) {
            matchingPackages = packages.filter((pkg) => {
              if (minPrice !== undefined && pkg.nightlyPrice < minPrice) return false;
              if (maxPrice !== undefined && pkg.nightlyPrice > maxPrice) return false;
              return true;
            });

            // Discard hotel only if ZERO room packages fall within the user's budget
            if (matchingPackages.length === 0) {
              continue;
            }
          }

          // Display the lowest rate that satisfies the user's search
          const sortedPackages = matchingPackages.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
          const chosenPackage = sortedPackages[0];
          startingPriceCents = chosenPackage.nightlyPrice;
          totalStayPriceCents = chosenPackage.totalPrice;
        } catch (err) {
          // If availability check fails for this hotel, continue
          continue;
        }
      } else {
        // No dates specified - collect all packages across room types
        const packages: Array<{ nightlyPrice: number; totalPrice: number; roomTypeName: string }> = [];
        for (const rt of hotel.room_types) {
          for (const rp of rt.rate_plans) {
            if (rp.base_price_cents > 0) {
              packages.push({
                nightlyPrice: rp.base_price_cents,
                totalPrice: rp.base_price_cents,
                roomTypeName: rt.name,
              });
            }
          }
        }

        if (packages.length === 0) {
          packages.push({ nightlyPrice: 25000, totalPrice: 25000, roomTypeName: 'Standard Room' });
        }

        const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
        let matchingPackages = packages;
        if (hasPriceFilter) {
          matchingPackages = packages.filter((pkg) => {
            if (minPrice !== undefined && pkg.nightlyPrice < minPrice) return false;
            if (maxPrice !== undefined && pkg.nightlyPrice > maxPrice) return false;
            return true;
          });

          if (matchingPackages.length === 0) {
            continue;
          }
        }

        const sortedPackages = matchingPackages.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
        const chosenPackage = sortedPackages[0];
        startingPriceCents = chosenPackage.nightlyPrice;
        totalStayPriceCents = chosenPackage.totalPrice;
        availableRoomTypesCount = hotel.room_types.length;
        totalAvailableRooms = hotel.room_types.reduce((acc, rt) => acc + (rt.rooms?.length || 0), 0);
      }

      // Filter by amenities (case-insensitive match)
      if (amenities && amenities.length > 0) {
        const matchesAllAmenities = amenities.every((reqAmenity) =>
          allHotelAmenities.some((hAmenity) =>
            hAmenity.toLowerCase().includes(reqAmenity.toLowerCase())
          )
        );
        if (!matchesAllAmenities) {
          continue;
        }
      }

      // Verified Guest rating calculation
      const hotelReviews = (hotel as any).reviews || [];
      const totalReviews = hotelReviews.length;
      const guestRating =
        totalReviews > 0
          ? Number((hotelReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews).toFixed(1))
          : null;

      // Cover image (deterministic & stable across all searches and filters)
      const coverImage = getStableHotelCoverImage(hotel);

      processedHotels.push({
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        description: hotel.description,
        category: hotel.category,
        starRating: hotel.star_rating,
        guestRating,
        totalReviews,
        address: hotel.address,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        postalCode: hotel.postal_code,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        phone: hotel.phone,
        email: hotel.email,
        currency: hotel.currency || 'INR',
        coverImage,
        images: hotel.images && hotel.images.length > 0 ? hotel.images : [coverImage],
        amenities: allHotelAmenities,
        startingPriceCents,
        totalStayPriceCents,
        availableRoomTypesCount,
        totalAvailableRooms,
        isAvailable,
        checkInTime: hotel.check_in_time || '15:00',
        checkOutTime: hotel.check_out_time || '11:00',
      });
    }

    // Apply Sorting
    if (sort === 'price_asc') {
      processedHotels.sort((a, b) => a.startingPriceCents - b.startingPriceCents);
    } else if (sort === 'price_desc') {
      processedHotels.sort((a, b) => b.startingPriceCents - a.startingPriceCents);
    } else if (sort === 'rating_desc') {
      processedHotels.sort((a, b) => b.starRating - a.starRating || b.guestRating - a.guestRating);
    } else {
      // 'recommended'
      processedHotels.sort(
        (a, b) => b.starRating - a.starRating || a.startingPriceCents - b.startingPriceCents
      );
    }

    // Pagination
    const totalCount = processedHotels.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const pagedHotels = processedHotels.slice(offset, offset + limit);
    const hasMore = page < totalPages;

    return {
      hotels: pagedHotels,
      totalCount,
      page,
      limit,
      totalPages,
      hasMore,
      appliedFilters: {
        destination,
        checkInDate,
        checkOutDate,
        guests,
        rooms,
        minPrice,
        maxPrice,
        starRating,
        category,
        amenities,
        sort,
      },
    };
  }

  async getRoomTypeDetails(
    hotelId: string,
    roomTypeId: string,
    checkInDate?: string,
    checkOutDate?: string,
    guests: number = 2,
    rooms: number = 1
  ): Promise<DetailedRoomType> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        address: true,
        star_rating: true,
        check_in_time: true,
        check_out_time: true,
        tax_rate_bps: true,
        currency: true,
        status: true,
      },
    });

    if (!hotel || hotel.status !== HotelStatus.ACTIVE) {
      throw new NotFoundError('Hotel not found or is currently inactive');
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id: roomTypeId, hotel_id: hotelId, is_active: true },
      include: {
        rate_plans: {
          where: { is_active: true },
          orderBy: { is_default: 'desc' },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundError('Room type not found in this hotel');
    }

    // Get verified reviews summary
    const reviews = await prisma.review.findMany({
      where: {
        hotel_id: hotelId,
        OR: [{ room_type_id: roomTypeId }, { room_type_id: null }],
      },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : null;

    // Pricing calculation if dates are provided
    let pricing: DetailedRoomType['pricing'];
    if (checkInDate && checkOutDate) {
      try {
        const inDate = new Date(checkInDate);
        const outDate = new Date(checkOutDate);
        const totalNights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
        const defaultRatePlan = roomType.rate_plans.find((rp) => rp.is_default) || roomType.rate_plans[0];
        const nightlyRateCents = defaultRatePlan ? defaultRatePlan.base_price_cents : 0;
        const subtotalCents = nightlyRateCents * totalNights * rooms;
        const taxCents = Math.round((subtotalCents * hotel.tax_rate_bps) / 10000);
        const feesCents = Math.round(subtotalCents * 0.05); // standard 5% service fee
        const totalCents = subtotalCents + taxCents + feesCents;

        pricing = {
          checkInDate,
          checkOutDate,
          totalNights,
          nightlyRateCents,
          subtotalCents,
          taxCents,
          feesCents,
          totalCents,
          currency: hotel.currency || 'INR',
        };
      } catch {
        // Fallback gracefully without pricing
      }
    }

    return {
      id: roomType.id,
      hotelId: hotel.id,
      name: roomType.name,
      slug: roomType.slug,
      description: roomType.description,
      maxGuests: roomType.max_guests,
      maxAdults: roomType.max_adults,
      maxChildren: roomType.max_children,
      bedType: roomType.bed_type,
      roomSizeSqm: roomType.room_size_sqm,
      amenities: roomType.amenities || [],
      images: roomType.images || [],
      ratePlans: roomType.rate_plans.map((rp) => ({
        id: rp.id,
        name: rp.name,
        description: rp.description,
        basePriceCents: rp.base_price_cents,
        cancellationPolicy: rp.cancellation_policy,
        cancellationDeadlineHours: rp.cancellation_deadline_hours,
        isDefault: rp.is_default,
      })),
      hotel: {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        city: hotel.city,
        country: hotel.country,
        address: hotel.address,
        starRating: hotel.star_rating,
        checkInTime: hotel.check_in_time,
        checkOutTime: hotel.check_out_time,
        taxRateBps: hotel.tax_rate_bps,
        currency: hotel.currency || 'INR',
      },
      pricing,
      reviewsSummary: {
        averageRating: avgRating,
        totalReviews,
      },
    };
  }

  async getHotelReviews(
    hotelId: string,
    roomTypeId?: string,
    page: number = 1,
    limit: number = 100
  ): Promise<ReviewSummary> {
    const where: any = { hotel_id: hotelId };
    if (roomTypeId) {
      where.OR = [{ room_type_id: roomTypeId }, { room_type_id: null }];
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true },
        },
        room_type: {
          select: { id: true, name: true, bed_type: true, max_guests: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const [totalReviews, allRatings] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({ where, select: { rating: true } }),
    ]);

    // For any review that has reservation_id but missing room_type, resolve room_type from reservation
    const reviewsMissingRoom = reviews.filter((r: any) => !r.room_type && r.reservation_id);
    let reservationRoomMap = new Map<string, { id: string; name: string; bed_type: string; max_guests: number }>();
    if (reviewsMissingRoom.length > 0) {
      const resIds = reviewsMissingRoom.map((r: any) => r.reservation_id!).filter(Boolean);
      const resRooms: any[] = await prisma.reservationRoom.findMany({
        where: { reservation_id: { in: resIds } },
        include: { room_type: { select: { id: true, name: true, bed_type: true, max_guests: true } } },
      });
      for (const rr of resRooms) {
        if (rr.room_type) {
          reservationRoomMap.set(rr.reservation_id, rr.room_type);
        }
      }
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of allRatings) {
      sum += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }
    const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : null;

    return {
      averageRating,
      totalReviews,
      ratingDistribution: distribution,
      reviews: reviews.map((r: any) => {
        const resolvedRoomType = r.room_type || (r.reservation_id ? reservationRoomMap.get(r.reservation_id) : null);
        return {
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          stayDate: r.stay_date,
          isVerified: r.is_verified,
          createdAt: r.created_at.toISOString(),
          user: {
            id: r.user.id,
            firstName: r.user.first_name,
            lastName: r.user.last_name,
          },
          roomType: resolvedRoomType
            ? {
                id: resolvedRoomType.id,
                name: resolvedRoomType.name,
                bedType: resolvedRoomType.bed_type,
                maxGuests: resolvedRoomType.max_guests,
                capacity: resolvedRoomType.max_guests,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Checks if a user has completed a verified stay at the hotel and has not yet submitted a review for it.
   */
  async checkReviewEligibility(hotelId: string, userId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true, name: true } });
    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Find all completed reservations for this user at this hotel
    const completedReservations = await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        status: ReservationStatus.CHECKED_OUT,
        OR: [
          { guest_user_id: userId },
          { guest_email: user.email },
        ],
      },
      include: {
        rooms: {
          select: { room_type_id: true },
          take: 1,
        },
      },
      orderBy: { check_out_date: 'desc' },
    });

    if (completedReservations.length === 0) {
      return {
        eligible: false,
        hasReviewed: false,
        reason: 'Only guests who have completed a stay at this hotel are eligible to submit a verified review.',
      };
    }

    // Check which completed reservations have already been reviewed
    const existingReviews = await prisma.review.findMany({
      where: {
        hotel_id: hotelId,
        user_id: userId,
      },
      select: { reservation_id: true, id: true },
    });

    // If user has already reviewed as many or more stays than completed reservations, no pending reviews exist
    if (existingReviews.length >= completedReservations.length) {
      return {
        eligible: false,
        hasReviewed: true,
        reason: 'You have already submitted a review for your past stay at this hotel.',
      };
    }

    const reviewedReservationIds = new Set(existingReviews.map((r) => r.reservation_id).filter(Boolean));

    // Find first unreviewed completed reservation
    const unreviewedReservation = completedReservations.find((res) => !reviewedReservationIds.has(res.id));

    if (!unreviewedReservation) {
      return {
        eligible: false,
        hasReviewed: true,
        reason: 'You have already submitted a review for your past stay at this hotel.',
      };
    }

    return {
      eligible: true,
      hasReviewed: false,
      hotelId: hotel.id,
      hotelName: hotel.name,
      reservationId: unreviewedReservation.id,
      reservationCode: unreviewedReservation.reservation_code,
      roomTypeId: unreviewedReservation.rooms[0]?.room_type_id || null,
      stayDate: unreviewedReservation.check_out_date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  }

  /**
   * Submits a verified guest review. Strictly enforces that the reviewer has completed a stay.
   */
  async createReview(
    hotelId: string,
    userId: string,
    input: { rating: number; title?: string; comment: string; roomTypeId?: string; stayDate?: string; reservationId?: string }
  ) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true, name: true } });
    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, first_name: true, last_name: true } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 1. Enforce verified guest rule: User MUST have a completed stay (CHECKED_OUT)
    const completedReservations = await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        status: ReservationStatus.CHECKED_OUT,
        OR: [
          { guest_user_id: userId },
          { guest_email: user.email },
        ],
      },
      include: {
        rooms: { select: { room_type_id: true }, take: 1 },
      },
      orderBy: { check_out_date: 'desc' },
    });

    if (completedReservations.length === 0) {
      throw new ForbiddenError('Only verified guests with a completed stay can rate and review this hotel.');
    }

    // 2. Check total existing reviews for this hotel by this user
    const existingUserReviews = await prisma.review.findMany({
      where: { hotel_id: hotelId, user_id: userId },
      select: { reservation_id: true },
    });

    if (existingUserReviews.length >= completedReservations.length) {
      throw new BadRequestError('You have already submitted a review for all your visits to this hotel.');
    }

    const reviewedIds = new Set(existingUserReviews.map((r) => r.reservation_id).filter(Boolean));

    // 3. Select target reservation and verify it hasn't been reviewed yet
    let targetReservation = input.reservationId
      ? completedReservations.find((r) => r.id === input.reservationId)
      : completedReservations.find((r) => !reviewedIds.has(r.id));

    if (!targetReservation) {
      throw new BadRequestError('No eligible unreviewed completed visit found.');
    }

    if (reviewedIds.has(targetReservation.id)) {
      throw new BadRequestError('You have already submitted a review for this completed stay.');
    }

    const alreadyReviewed = await prisma.review.findFirst({
      where: { reservation_id: targetReservation.id },
    });
    if (alreadyReviewed) {
      throw new BadRequestError('You have already submitted a review for this completed stay.');
    }

    const stayDate = input.stayDate || (targetReservation
      ? targetReservation.check_out_date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));

    const roomTypeId = input.roomTypeId || targetReservation?.rooms[0]?.room_type_id || null;

    const review = await prisma.review.create({
      data: {
        hotel_id: hotelId,
        user_id: userId,
        reservation_id: targetReservation.id,
        room_type_id: roomTypeId,
        rating: Math.min(Math.max(input.rating, 1), 5),
        title: input.title,
        comment: input.comment,
        stay_date: stayDate,
        is_verified: true,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      stayDate: review.stay_date,
      isVerified: review.is_verified,
      createdAt: review.created_at.toISOString(),
      user: {
        id: review.user.id,
        firstName: review.user.first_name,
        lastName: review.user.last_name,
      },
    };
  }
}

export const hotelsService = new HotelsService();

