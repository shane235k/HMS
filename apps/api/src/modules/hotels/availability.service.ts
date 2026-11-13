// apps/api/src/modules/hotels/availability.service.ts
import { prisma } from '@hbms/database';
import {
  ReservationStatus,
  AssignmentStatus,
  CreateHoldInput,
} from '@hbms/shared';
import crypto from 'crypto';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors';

export interface NightAvailability {
  date: string; // YYYY-MM-DD
  totalPhysical: number;
  maintenanceBlocked: number;
  committedReserved: number;
  available: number;
}

export interface RatePlanQuote {
  ratePlanId: string;
  name: string;
  description?: string | null;
  cancellationPolicy: string;
  cancellationDeadlineHours: number;
  isDefault: boolean;
  isAvailable: boolean;
  nightlyRates: { date: string; priceCents: number; isOverride?: boolean }[];
  subtotalCents: number;
  taxCents: number;
  feesCents: number;
  totalCents: number;
}

export interface RoomTypeAvailabilityQuote {
  roomTypeId: string;
  name: string;
  slug: string;
  description?: string | null;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  bedType: string;
  roomSizeSqm?: number | null;
  amenities: string[];
  images: string[];
  availableQuantity: number;
  nightlyBreakdown: NightAvailability[];
  ratePlans: RatePlanQuote[];
}

export interface HotelAvailabilityResponse {
  hotel: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    taxRateBps: number;
    checkInTime: string;
    checkOutTime: string;
  };
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  requestedGuests: number;
  requestedRooms: number;
  roomTypes: RoomTypeAvailabilityQuote[];
}

export function normalizeToUtcMidnight(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function formatUtcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStayNights(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  const current = normalizeToUtcMidnight(checkIn);
  const end = normalizeToUtcMidnight(checkOut);

  while (current.getTime() < end.getTime()) {
    nights.push(new Date(current.getTime()));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return nights;
}

export function computeIdempotencyFingerprint(payload: any): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function generateReservationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RES-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class AvailabilityService {
  /**
   * Calculates night-by-night availability and pricing for all active room types in a hotel.
   * Can accept a Prisma transaction client for atomic checks within hold/reservation creation.
   */
  async calculateAvailability(
    hotelId: string,
    checkInDate: Date | string,
    checkOutDate: Date | string,
    requestedGuests: number = 1,
    requestedRooms: number = 1,
    client: any = prisma
  ): Promise<HotelAvailabilityResponse> {
    const checkIn = normalizeToUtcMidnight(checkInDate);
    const checkOut = normalizeToUtcMidnight(checkOutDate);

    if (checkIn.getTime() >= checkOut.getTime()) {
      throw new ValidationError('Check-in date must be strictly before check-out date');
    }

    const hotel = await client.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        tax_rate_bps: true,
        check_in_time: true,
        check_out_time: true,
        status: true,
      },
    });

    if (!hotel || hotel.status !== 'ACTIVE') {
      throw new NotFoundError('Hotel not found or is currently inactive');
    }

    const stayNights = getStayNights(checkIn, checkOut);
    const totalNights = stayNights.length;
    const now = new Date();

    // 1. Fetch active room types for this hotel
    const roomTypes = await client.roomType.findMany({
      where: {
        hotel_id: hotelId,
        is_active: true,
      },
      include: {
        rooms: {
          where: { is_active: true },
          select: { id: true, room_number: true, floor: true, operational_status: true, is_active: true },
        },
        rate_plans: {
          where: { is_active: true },
          include: {
            calendars: {
              where: {
                date: {
                  gte: checkIn,
                  lt: checkOut,
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch overlapping maintenance blocks for physical rooms belonging to this hotel
    const roomBlocks = await client.roomBlock.findMany({
      where: {
        hotel_id: hotelId,
        start_date: { lt: checkOut },
        end_date: { gt: checkIn },
      },
      select: {
        room_id: true,
        start_date: true,
        end_date: true,
      },
    });

    // 3. Fetch overlapping reservations for this hotel that commit inventory
    // Overlapping condition: check_in_date < checkOut AND check_out_date > checkIn
    // Status must be CONFIRMED, CHECKED_IN, or TEMPORARY_HOLD with hold_expires_at > now
    const overlappingReservations = await client.reservation.findMany({
      where: {
        hotel_id: hotelId,
        check_in_date: { lt: checkOut },
        check_out_date: { gt: checkIn },
        OR: [
          { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] } },
          {
            status: ReservationStatus.TEMPORARY_HOLD,
            hold_expires_at: { gt: now },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        check_in_date: true,
        check_out_date: true,
        rooms: {
          select: {
            room_type_id: true,
            quantity: true,
          },
        },
      },
    });

    // 4. Compute night-by-night availability and pricing per RoomType
    const roomTypeQuotes: RoomTypeAvailabilityQuote[] = [];

    for (const rt of roomTypes) {
      // Filter by capacity if requested
      const perRoomGuestRequirement = Math.ceil(requestedGuests / requestedRooms);
      if (rt.max_guests < perRoomGuestRequirement) {
        // Still can return it, or flag availableQuantity = 0 if requestedGuests exceeds capacity
      }

      const activeRooms = rt.rooms;
      const totalPhysical = activeRooms.length;
      const activeRoomIds = new Set(activeRooms.map((r: any) => r.id));

      const nightlyBreakdown: NightAvailability[] = [];

      for (const night of stayNights) {
        const nightTime = night.getTime();
        const nextNightTime = nightTime + 24 * 60 * 60 * 1000;
        const dateStr = formatUtcDateString(night);

        // A. Maintenance blocks on this night for active rooms under this room type
        const blockedRoomIds = new Set<string>();
        for (const block of roomBlocks) {
          if (!activeRoomIds.has(block.room_id)) continue;
          const blockStart = normalizeToUtcMidnight(block.start_date).getTime();
          const blockEnd = normalizeToUtcMidnight(block.end_date).getTime();

          // Overlaps night if blockStart <= nightTime < blockEnd
          if (blockStart <= nightTime && nightTime < blockEnd) {
            blockedRoomIds.add(block.room_id);
          }
        }
        const maintenanceBlocked = blockedRoomIds.size;
        const availablePhysical = Math.max(0, totalPhysical - maintenanceBlocked);

        // B. Committed reservations / holds on this night for this room type
        let committedCount = 0;
        for (const res of overlappingReservations) {
          const resStart = normalizeToUtcMidnight(res.check_in_date).getTime();
          const resEnd = normalizeToUtcMidnight(res.check_out_date).getTime();

          if (resStart <= nightTime && nightTime < resEnd) {
            for (const item of res.rooms) {
              if (item.room_type_id === rt.id) {
                committedCount += item.quantity;
              }
            }
          }
        }

        const available = Math.max(0, availablePhysical - committedCount);

        nightlyBreakdown.push({
          date: dateStr,
          totalPhysical,
          maintenanceBlocked,
          committedReserved: committedCount,
          available,
        });
      }

      // Minimum availability across all nights determines the stay's available quantity
      const minAvailableAcrossStay =
        nightlyBreakdown.length > 0
          ? Math.min(...nightlyBreakdown.map((n) => n.available))
          : 0;

      // Rate Plan pricing calculations
      const ratePlanQuotes: RatePlanQuote[] = [];

      for (const rp of rt.rate_plans) {
        const calendarMap = new Map<string, any>();
        for (const cal of rp.calendars) {
          calendarMap.set(formatUtcDateString(normalizeToUtcMidnight(cal.date)), cal);
        }

        let isAvailableAcrossStay = true;
        let staySubtotalCents = 0;
        const nightlyRates: { date: string; priceCents: number; isOverride?: boolean }[] = [];

        for (const night of stayNights) {
          const dateStr = formatUtcDateString(night);
          const override = calendarMap.get(dateStr);

          if (override && override.is_available === false) {
            isAvailableAcrossStay = false;
          }

          const hasOverride =
            override && override.price_override_cents !== null && override.price_override_cents !== undefined;
          const priceCents = hasOverride
            ? override.price_override_cents
            : rp.base_price_cents;

          nightlyRates.push({ date: dateStr, priceCents, isOverride: Boolean(hasOverride) });
          staySubtotalCents += priceCents;
        }

        const taxRateBps = hotel.tax_rate_bps || 1200;
        const taxCents = Math.round((staySubtotalCents * taxRateBps) / 10000);
        const feesCents = 0; // Baseline standard fees
        const totalCents = staySubtotalCents + taxCents + feesCents;

        ratePlanQuotes.push({
          ratePlanId: rp.id,
          name: rp.name,
          description: (rp as any).description || null,
          cancellationPolicy: rp.cancellation_policy,
          cancellationDeadlineHours: rp.cancellation_deadline_hours,
          isDefault: rp.is_default,
          isAvailable: isAvailableAcrossStay && minAvailableAcrossStay >= requestedRooms,
          nightlyRates,
          subtotalCents: staySubtotalCents,
          taxCents,
          feesCents,
          totalCents,
        });
      }

      roomTypeQuotes.push({
        roomTypeId: rt.id,
        name: rt.name,
        slug: rt.slug,
        description: rt.description,
        maxGuests: rt.max_guests,
        maxAdults: rt.max_adults,
        maxChildren: rt.max_children,
        bedType: rt.bed_type,
        roomSizeSqm: rt.room_size_sqm,
        amenities: rt.amenities || [],
        images: (rt as any).images || [],
        availableQuantity: minAvailableAcrossStay,
        nightlyBreakdown,
        ratePlans: ratePlanQuotes,
      });
    }

    return {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        currency: hotel.currency,
        taxRateBps: hotel.tax_rate_bps,
        checkInTime: hotel.check_in_time,
        checkOutTime: hotel.check_out_time,
      },
      checkInDate: formatUtcDateString(checkIn),
      checkOutDate: formatUtcDateString(checkOut),
      totalNights,
      requestedGuests,
      requestedRooms,
      roomTypes: roomTypeQuotes,
    };
  }

  /**
   * Atomically acquires a temporary inventory hold coordinated through RoomType.version.
   * Runs within an interactive MongoDB multi-document transaction.
   */
  async createTemporaryHold(
    hotelId: string,
    input: CreateHoldInput,
    guestUserId?: string
  ) {
    const checkIn = normalizeToUtcMidnight(input.checkInDate);
    const checkOut = normalizeToUtcMidnight(input.checkOutDate);

    if (checkIn.getTime() >= checkOut.getTime()) {
      throw new ValidationError('Check-in date must be strictly before check-out date');
    }

    const today = normalizeToUtcMidnight(new Date());
    if (checkIn.getTime() < today.getTime()) {
      throw new ValidationError('Check-in date cannot be in the past');
    }

    // 1. Idempotency Check (target-verified SHA-256 fingerprint)
    const idempotencyFingerprint = input.idempotencyKey
      ? computeIdempotencyFingerprint({
          hotelId,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guestEmail: input.guestEmail.toLowerCase(),
          rooms: input.rooms,
        })
      : null;

    if (input.idempotencyKey) {
      const existing = await prisma.reservation.findFirst({
        where: { idempotency_key: input.idempotencyKey },
        include: {
          rooms: {
            include: {
              room_type: { select: { id: true, name: true, slug: true } },
              rate_plan: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (existing) {
        if (existing.idempotency_fingerprint === idempotencyFingerprint) {
          // Idempotent replay
          return {
            isReplay: true,
            reservation: existing,
          };
        }
        throw new ConflictError(
          'Idempotency key collision: This idempotency key was previously used with different booking parameters'
        );
      }
    }

    // 2. Execute within interactive MongoDB transaction (with automatic retry on write conflict)
    const holdDurationMinutes = 15;
    const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

    let attempts = 0;
    const maxRetries = 6;
    let result: any = null;

    while (attempts < maxRetries) {
      try {
        attempts++;
        result = await prisma.$transaction(
          async (tx) => {
            // A. Verify Hotel exists and is active
            const hotel = await tx.hotel.findUnique({
              where: { id: hotelId },
              select: { id: true, name: true, currency: true, tax_rate_bps: true, status: true },
            });

            if (!hotel || hotel.status !== 'ACTIVE') {
              throw new NotFoundError('Hotel not found or is currently inactive');
            }

            // B. Re-verify availability inside the transaction
            const availability = await this.calculateAvailability(
              hotelId,
              checkIn,
              checkOut,
              1,
              1,
              tx
            );

            const availabilityMap = new Map<string, RoomTypeAvailabilityQuote>();
            for (const rt of availability.roomTypes) {
              availabilityMap.set(rt.roomTypeId, rt);
            }

            // Aggregate requested quantities per room type
            const requestedQuantities = new Map<string, number>();
            for (const item of input.rooms) {
              const current = requestedQuantities.get(item.roomTypeId) || 0;
              requestedQuantities.set(item.roomTypeId, current + item.quantity);
            }

            // C. Check availability and atomically increment RoomType.version (OCC Guard)
            for (const [roomTypeId, qty] of requestedQuantities.entries()) {
              const quote = availabilityMap.get(roomTypeId);
              if (!quote) {
                throw new NotFoundError(`Room type ${roomTypeId} not found in this hotel`);
              }

              if (quote.availableQuantity < qty) {
                throw new ConflictError(
                  `Insufficient inventory for room type "${quote.name}". Requested ${qty}, but only ${quote.availableQuantity} available for the selected dates.`
                );
              }

              // Fetch current version for conditional update
              const currentRoomType = await tx.roomType.findUnique({
                where: { id: roomTypeId },
                select: { id: true, version: true },
              });

              if (!currentRoomType) {
                throw new NotFoundError(`Room type ${roomTypeId} not found`);
              }

              await tx.roomType.update({
                where: { id: roomTypeId },
                data: {
                  version: { increment: 1 },
                },
              });
            }

            // D. Calculate pricing for all requested line items
            let totalSubtotalCents = 0;
            let totalRoomsCount = 0;
            const reservationRoomsData: any[] = [];

            for (const item of input.rooms) {
              const rtQuote = availabilityMap.get(item.roomTypeId)!;
              const rpQuote = rtQuote.ratePlans.find((rp) => rp.ratePlanId === item.ratePlanId);

              if (!rpQuote) {
                throw new NotFoundError(
                  `Rate plan ${item.ratePlanId} not found under room type "${rtQuote.name}"`
                );
              }

              if (!rpQuote.isAvailable) {
                throw new ConflictError(
                  `Rate plan "${rpQuote.name}" is not commercially available for the selected dates.`
                );
              }

              const itemSubtotalCents = rpQuote.subtotalCents * item.quantity;
              totalSubtotalCents += itemSubtotalCents;
              totalRoomsCount += item.quantity;

              reservationRoomsData.push({
                room_type: { connect: { id: item.roomTypeId } },
                rate_plan: { connect: { id: item.ratePlanId } },
                quantity: item.quantity,
                nightly_rate_cents: Math.round(rpQuote.subtotalCents / availability.totalNights),
                total_price_cents: itemSubtotalCents,
                nightly_breakdown: rpQuote.nightlyRates.map((nr) => ({
                  date: nr.date,
                  rate_cents: nr.priceCents,
                  is_override: Boolean(nr.isOverride),
                })),
              });
            }

            const taxRateBps = hotel.tax_rate_bps || 1200;
            const totalTaxCents = Math.round((totalSubtotalCents * taxRateBps) / 10000);
            const totalFeesCents = 0;
            const totalCents = totalSubtotalCents + totalTaxCents + totalFeesCents;

            // E. Generate unique reservation code
            let reservationCode = generateReservationCode();
            let codeExists = true;
            let loopAttempts = 0;
            while (codeExists && loopAttempts < 5) {
              const existing = await tx.reservation.findUnique({
                where: { reservation_code: reservationCode },
                select: { id: true },
              });
              if (!existing) {
                codeExists = false;
              } else {
                reservationCode = generateReservationCode();
                loopAttempts++;
              }
            }

            // F. Create Reservation in TEMPORARY_HOLD status
            let resolvedUserId = guestUserId || null;
            if (!resolvedUserId) {
              const existingUser = await tx.user.findUnique({
                where: { email: input.guestEmail.toLowerCase().trim() },
                select: { id: true },
              });
              if (existingUser) {
                resolvedUserId = existingUser.id;
              }
            }

            const reservation = await tx.reservation.create({
              data: {
                reservation_code: reservationCode,
                idempotency_key: input.idempotencyKey || null,
                idempotency_fingerprint: idempotencyFingerprint,
                hotel: { connect: { id: hotelId } },
                guest_user_id: resolvedUserId,
                guest_name: input.guestName.trim(),
                guest_email: input.guestEmail.toLowerCase().trim(),
                guest_phone: input.guestPhone.trim(),
                check_in_date: checkIn,
                check_out_date: checkOut,
                total_rooms_count: totalRoomsCount,
                status: ReservationStatus.TEMPORARY_HOLD,
                hold_expires_at: holdExpiresAt,
                subtotal_cents: totalSubtotalCents,
                tax_cents: totalTaxCents,
                fees_cents: totalFeesCents,
                total_cents: totalCents,
                currency: hotel.currency,
                rooms: {
                  create: reservationRoomsData,
                },
              },
              include: {
                rooms: {
                  include: {
                    room_type: { select: { id: true, name: true, slug: true } },
                    rate_plan: { select: { id: true, name: true } },
                  },
                },
              },
            });

            return reservation;
          },
          {
            maxWait: 5000,
            timeout: 10000,
          }
        );
        break;
      } catch (err: any) {
        const isConflict =
          err.code === 'P2034' ||
          err.message?.toLowerCase().includes('write conflict') ||
          err.message?.toLowerCase().includes('deadlock');

        if (isConflict && attempts < maxRetries) {
          await new Promise((res) => setTimeout(res, 80 * attempts + Math.random() * 60));
          continue;
        }
        if (isConflict) {
          throw new ConflictError('Concurrent inventory mutation conflict. Please retry.');
        }
        throw err;
      }
    }

    return {
      isReplay: false,
      reservation: result,
    };
  }
}

export const availabilityService = new AvailabilityService();
