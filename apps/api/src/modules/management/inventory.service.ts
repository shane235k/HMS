// apps/api/src/modules/management/inventory.service.ts
import { prisma } from '@hbms/database';
import {
  CreateRoomTypeInput,
  UpdateRoomTypeInput,
  CreateRoomInput,
  UpdateRoomInput,
  CreateRoomBlockInput,
  CreateRatePlanInput,
  UpdateRatePlanInput,
  RateCalendarOverrideInput,
  BulkRateCalendarOverrideInput,
  OperationalStatus,
  Role,
} from '@hbms/shared';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../common/errors';
import { logAuditEvent } from '../../common/utils/audit';
import {
  normalizeToUtcMidnight,
  getStayNights,
  formatUtcDateString,
} from '../hotels/availability.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class InventoryService {
  // ====================================================
  // 1. ROOM TYPES
  // ====================================================

  async listRoomTypes(hotelId: string) {
    return prisma.roomType.findMany({
      where: { hotel_id: hotelId },
      include: {
        rate_plans: {
          orderBy: { is_default: 'desc' },
        },
        _count: {
          select: {
            rooms: true,
            rate_plans: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getRoomType(hotelId: string, roomTypeId: string) {
    const roomType = await prisma.roomType.findFirst({
      where: { id: roomTypeId, hotel_id: hotelId },
      include: {
        rooms: {
          orderBy: { room_number: 'asc' },
        },
        rate_plans: {
          orderBy: { is_default: 'desc' },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundError('Room type not found in this hotel');
    }

    return roomType;
  }

  async createRoomType(
    hotelId: string,
    managerUserId: string,
    input: CreateRoomTypeInput,
    ipAddress?: string
  ) {
    // Check name uniqueness in hotel
    const existing = await prisma.roomType.findFirst({
      where: { hotel_id: hotelId, name: input.name.trim() },
    });

    if (existing) {
      throw new ConflictError(`A room type named "${input.name.trim()}" already exists in this hotel`);
    }

    let slug = slugify(input.name);
    // Ensure slug unique
    let slugExists = await prisma.roomType.findFirst({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const roomType = await prisma.$transaction(async (tx) => {
      const created = await tx.roomType.create({
        data: {
          hotel_id: hotelId,
          name: input.name.trim(),
          slug,
          description: input.description,
          max_guests: input.maxGuests,
          max_adults: input.maxAdults,
          max_children: input.maxChildren,
          bed_type: input.bedType,
          room_size_sqm: input.roomSizeSqm,
          amenities: input.amenities || [],
          images: input.images || [],
          is_active: true,
          version: 0,
        },
      });

      // If basePriceCents is provided, automatically create a default RatePlan
      if (input.basePriceCents) {
        await tx.ratePlan.create({
          data: {
            room_type_id: created.id,
            name: 'Standard Flexible Rate',
            description: 'Best available flexible rate with free cancellation',
            base_price_cents: input.basePriceCents,
            cancellation_policy: 'FREE_CANCELLATION' as any,
            cancellation_deadline_hours: 48,
            is_default: true,
            is_active: true,
          },
        });
      }

      return created;
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'ROOM_TYPE_CREATED',
      entityType: 'RoomType',
      entityId: roomType.id,
      newState: roomType,
      ipAddress,
    });

    return this.getRoomType(hotelId, roomType.id);
  }

  async updateRoomType(
    hotelId: string,
    roomTypeId: string,
    managerUserId: string,
    input: UpdateRoomTypeInput,
    ipAddress?: string
  ) {
    const existing = await prisma.roomType.findFirst({
      where: { id: roomTypeId, hotel_id: hotelId },
    });

    if (!existing) {
      throw new NotFoundError('Room type not found in this hotel');
    }

    if (input.name && input.name.trim() !== existing.name) {
      const nameClash = await prisma.roomType.findFirst({
        where: {
          hotel_id: hotelId,
          name: input.name.trim(),
          id: { not: roomTypeId },
        },
      });
      if (nameClash) {
        throw new ConflictError(`Another room type named "${input.name.trim()}" already exists`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // OCC version guard
      const res = await tx.roomType.updateMany({
        where: {
          id: roomTypeId,
          version: existing.version,
        },
        data: {
          name: input.name !== undefined ? input.name.trim() : existing.name,
          description: input.description !== undefined ? input.description : existing.description,
          max_guests: input.maxGuests !== undefined ? input.maxGuests : existing.max_guests,
          max_adults: input.maxAdults !== undefined ? input.maxAdults : existing.max_adults,
          max_children: input.maxChildren !== undefined ? input.maxChildren : existing.max_children,
          bed_type: input.bedType !== undefined ? input.bedType : existing.bed_type,
          room_size_sqm: input.roomSizeSqm !== undefined ? input.roomSizeSqm : existing.room_size_sqm,
          amenities: input.amenities !== undefined ? input.amenities : existing.amenities,
          images: input.images !== undefined ? input.images : (existing as any).images || [],
          is_active: input.isActive !== undefined ? input.isActive : existing.is_active,
          version: { increment: 1 },
        },
      });

      if (res.count === 0) {
        throw new ConflictError('RoomType was concurrently modified. Please reload and try again.');
      }

      return tx.roomType.findUnique({ where: { id: roomTypeId } });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'ROOM_TYPE_UPDATED',
      entityType: 'RoomType',
      entityId: roomTypeId,
      previousState: existing,
      newState: updated,
      ipAddress,
    });

    return updated;
  }

  async updateRoomTypeStatus(
    hotelId: string,
    roomTypeId: string,
    isActive: boolean,
    managerUserId: string,
    ipAddress?: string
  ) {
    return this.updateRoomType(
      hotelId,
      roomTypeId,
      managerUserId,
      { isActive },
      ipAddress
    );
  }

  // ====================================================
  // 2. PHYSICAL ROOMS
  // ====================================================

  async listRooms(hotelId: string, roomTypeId?: string, operationalStatus?: OperationalStatus) {
    return prisma.room.findMany({
      where: {
        hotel_id: hotelId,
        room_type_id: roomTypeId || undefined,
        operational_status: operationalStatus || undefined,
      },
      include: {
        room_type: {
          select: { id: true, name: true, slug: true },
        },
        blocks: {
          where: { end_date: { gt: new Date() } },
          orderBy: { start_date: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { room_number: 'asc' }],
    });
  }

  async getRoom(hotelId: string, roomId: string) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotel_id: hotelId },
      include: {
        room_type: true,
        blocks: {
          orderBy: { start_date: 'desc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found in this hotel');
    }

    return room;
  }

  async createRoom(
    hotelId: string,
    managerUserId: string,
    input: CreateRoomInput,
    ipAddress?: string
  ) {
    // Check room number uniqueness in hotel
    const existing = await prisma.room.findUnique({
      where: {
        hotel_id_room_number: {
          hotel_id: hotelId,
          room_number: input.roomNumber.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Room number "${input.roomNumber.trim()}" already exists in this hotel`
      );
    }

    // Verify room type belongs to hotel
    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId, hotel_id: hotelId },
    });

    if (!roomType) {
      throw new NotFoundError('Room type does not belong to this hotel');
    }

    // Commercial inventory changes: increment RoomType.version
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          hotel_id: hotelId,
          room_type_id: input.roomTypeId,
          room_number: input.roomNumber.trim(),
          floor: input.floor,
          operational_status: input.operationalStatus,
          is_active: true,
          version: 0,
        },
        include: {
          room_type: { select: { id: true, name: true, slug: true } },
        },
      });

      await tx.roomType.update({
        where: { id: input.roomTypeId },
        data: { version: { increment: 1 } },
      });

      return created;
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: room.id,
      newState: room,
      ipAddress,
    });

    return room;
  }

  async updateRoom(
    hotelId: string,
    roomId: string,
    managerUserId: string,
    input: UpdateRoomInput,
    ipAddress?: string
  ) {
    const existing = await prisma.room.findFirst({
      where: { id: roomId, hotel_id: hotelId },
    });

    if (!existing) {
      throw new NotFoundError('Room not found in this hotel');
    }

    if (input.roomNumber && input.roomNumber.trim() !== existing.room_number) {
      const clash = await prisma.room.findUnique({
        where: {
          hotel_id_room_number: {
            hotel_id: hotelId,
            room_number: input.roomNumber.trim(),
          },
        },
      });
      if (clash) {
        throw new ConflictError(`Room number "${input.roomNumber.trim()}" is already in use`);
      }
    }

    if (input.roomTypeId && input.roomTypeId !== existing.room_type_id) {
      const newRt = await prisma.roomType.findFirst({
        where: { id: input.roomTypeId, hotel_id: hotelId },
      });
      if (!newRt) {
        throw new NotFoundError('Target room type does not belong to this hotel');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Coordinated update on Room.version
      const res = await tx.room.updateMany({
        where: {
          id: roomId,
          version: existing.version,
        },
        data: {
          room_number: input.roomNumber !== undefined ? input.roomNumber.trim() : existing.room_number,
          room_type_id: input.roomTypeId !== undefined ? input.roomTypeId : existing.room_type_id,
          floor: input.floor !== undefined ? input.floor : existing.floor,
          operational_status: input.operationalStatus !== undefined ? input.operationalStatus : existing.operational_status,
          is_active: input.isActive !== undefined ? input.isActive : existing.is_active,
          version: { increment: 1 },
        },
      });

      if (res.count === 0) {
        throw new ConflictError('Room was concurrently modified. Please reload and try again.');
      }

      // If room type or active status changed, increment affected RoomType versions
      const affectedRoomTypeIds = new Set<string>([existing.room_type_id]);
      if (input.roomTypeId) affectedRoomTypeIds.add(input.roomTypeId);

      for (const rtId of affectedRoomTypeIds) {
        await tx.roomType.update({
          where: { id: rtId },
          data: { version: { increment: 1 } },
        });
      }

      return tx.room.findUnique({
        where: { id: roomId },
        include: { room_type: { select: { id: true, name: true, slug: true } } },
      });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'ROOM_UPDATED',
      entityType: 'Room',
      entityId: roomId,
      previousState: existing,
      newState: updated,
      ipAddress,
    });

    return updated;
  }

  async updateRoomOperationalStatus(
    hotelId: string,
    roomId: string,
    operationalStatus: OperationalStatus,
    managerUserId: string,
    ipAddress?: string
  ) {
    const existing = await prisma.room.findFirst({
      where: { id: roomId, hotel_id: hotelId },
    });

    if (!existing) {
      throw new NotFoundError('Room not found in this hotel');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.room.updateMany({
        where: {
          id: roomId,
          version: existing.version,
        },
        data: {
          operational_status: operationalStatus,
          version: { increment: 1 },
        },
      });

      if (res.count === 0) {
        throw new ConflictError('Room status was concurrently modified. Please reload and try again.');
      }

      return tx.room.findUnique({
        where: { id: roomId },
        include: { room_type: { select: { id: true, name: true } } },
      });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: `ROOM_STATUS_${operationalStatus}`,
      entityType: 'Room',
      entityId: roomId,
      previousState: { operational_status: existing.operational_status },
      newState: { operational_status: operationalStatus },
      ipAddress,
    });

    return updated;
  }

  // ====================================================
  // 3. MAINTENANCE & OUT-OF-ORDER DATE BLOCKS
  // ====================================================

  async listRoomBlocks(hotelId: string, roomId?: string) {
    return prisma.roomBlock.findMany({
      where: {
        hotel_id: hotelId,
        room_id: roomId || undefined,
      },
      include: {
        room: {
          select: {
            id: true,
            room_number: true,
            floor: true,
            room_type: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { start_date: 'asc' },
    });
  }

  async createRoomBlock(
    hotelId: string,
    roomId: string,
    managerUserId: string,
    input: CreateRoomBlockInput,
    ipAddress?: string
  ) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotel_id: hotelId },
    });

    if (!room) {
      throw new NotFoundError('Room not found in this hotel');
    }

    const startDate = normalizeToUtcMidnight(input.startDate);
    const endDate = normalizeToUtcMidnight(input.endDate);

    if (startDate.getTime() >= endDate.getTime()) {
      throw new ValidationError('Start date must be strictly before end date');
    }

    // Coordinated update: atomically conditionally increment Room.version AND RoomType.version
    const block = await prisma.$transaction(async (tx) => {
      const roomUpdate = await tx.room.updateMany({
        where: { id: roomId, version: room.version },
        data: { version: { increment: 1 } },
      });

      if (roomUpdate.count === 0) {
        throw new ConflictError('Physical room state was modified concurrently; retry');
      }

      await tx.roomType.update({
        where: { id: room.room_type_id },
        data: { version: { increment: 1 } },
      });

      const created = await tx.roomBlock.create({
        data: {
          hotel_id: hotelId,
          room_id: roomId,
          start_date: startDate,
          end_date: endDate,
          reason: input.reason.trim(),
          created_by_id: managerUserId,
        },
        include: {
          room: {
            select: { id: true, room_number: true, room_type: { select: { id: true, name: true } } },
          },
        },
      });

      return created;
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'MAINTENANCE_BLOCK_CREATED',
      entityType: 'RoomBlock',
      entityId: block.id,
      newState: block,
      ipAddress,
    });

    return block;
  }

  async deleteRoomBlock(
    hotelId: string,
    blockId: string,
    managerUserId: string,
    ipAddress?: string
  ) {
    const block = await prisma.roomBlock.findFirst({
      where: { id: blockId, hotel_id: hotelId },
      include: { room: true },
    });

    if (!block) {
      throw new NotFoundError('Maintenance block not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.roomBlock.delete({ where: { id: blockId } });

      await tx.room.update({
        where: { id: block.room_id },
        data: { version: { increment: 1 } },
      });

      await tx.roomType.update({
        where: { id: block.room.room_type_id },
        data: { version: { increment: 1 } },
      });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'MAINTENANCE_BLOCK_REMOVED',
      entityType: 'RoomBlock',
      entityId: blockId,
      previousState: block,
      ipAddress,
    });

    return { success: true, message: 'Maintenance block removed successfully' };
  }

  // ====================================================
  // 4. RATE PLANS
  // ====================================================

  async listRatePlans(hotelId: string, roomTypeId?: string) {
    return prisma.ratePlan.findMany({
      where: {
        room_type: { hotel_id: hotelId },
        room_type_id: roomTypeId || undefined,
      },
      include: {
        room_type: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { calendars: true },
        },
      },
      orderBy: [{ room_type_id: 'asc' }, { is_default: 'desc' }],
    });
  }

  async getRatePlan(hotelId: string, ratePlanId: string) {
    const plan = await prisma.ratePlan.findFirst({
      where: {
        id: ratePlanId,
        room_type: { hotel_id: hotelId },
      },
      include: {
        room_type: true,
      },
    });

    if (!plan) {
      throw new NotFoundError('Rate plan not found');
    }

    return plan;
  }

  async createRatePlan(
    hotelId: string,
    managerUserId: string,
    input: CreateRatePlanInput,
    ipAddress?: string
  ) {
    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId, hotel_id: hotelId },
    });

    if (!roomType) {
      throw new NotFoundError('Room type does not belong to this hotel');
    }

    const ratePlan = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        // Reset existing default rate plans for this room type
        await tx.ratePlan.updateMany({
          where: { room_type_id: input.roomTypeId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.ratePlan.create({
        data: {
          room_type_id: input.roomTypeId,
          name: input.name.trim(),
          description: input.description,
          base_price_cents: input.basePriceCents,
          cancellation_policy: input.cancellationPolicy,
          cancellation_deadline_hours: input.cancellationDeadlineHours,
          is_default: input.isDefault,
          is_active: true,
        },
        include: {
          room_type: { select: { id: true, name: true, slug: true } },
        },
      });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'RATE_PLAN_CREATED',
      entityType: 'RatePlan',
      entityId: ratePlan.id,
      newState: ratePlan,
      ipAddress,
    });

    return ratePlan;
  }

  async updateRatePlan(
    hotelId: string,
    ratePlanId: string,
    managerUserId: string,
    input: UpdateRatePlanInput,
    ipAddress?: string
  ) {
    const existing = await prisma.ratePlan.findFirst({
      where: {
        id: ratePlanId,
        room_type: { hotel_id: hotelId },
      },
    });

    if (!existing) {
      throw new NotFoundError('Rate plan not found in this hotel');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.ratePlan.updateMany({
          where: { room_type_id: existing.room_type_id, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.ratePlan.update({
        where: { id: ratePlanId },
        data: {
          name: input.name !== undefined ? input.name.trim() : existing.name,
          description: input.description !== undefined ? input.description : (existing as any).description,
          base_price_cents: input.basePriceCents !== undefined ? input.basePriceCents : existing.base_price_cents,
          cancellation_policy: input.cancellationPolicy !== undefined ? input.cancellationPolicy : existing.cancellation_policy,
          cancellation_deadline_hours:
            input.cancellationDeadlineHours !== undefined
              ? input.cancellationDeadlineHours
              : existing.cancellation_deadline_hours,
          is_default: input.isDefault !== undefined ? input.isDefault : existing.is_default,
          is_active: input.isActive !== undefined ? input.isActive : existing.is_active,
        },
        include: {
          room_type: { select: { id: true, name: true } },
        },
      });
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'RATE_PLAN_UPDATED',
      entityType: 'RatePlan',
      entityId: ratePlanId,
      previousState: existing,
      newState: updated,
      ipAddress,
    });

    return updated;
  }

  // ====================================================
  // 5. RATE CALENDAR OVERRIDES
  // ====================================================

  async getRateCalendar(hotelId: string, ratePlanId: string, startDate?: string, endDate?: string) {
    const ratePlan = await prisma.ratePlan.findFirst({
      where: { id: ratePlanId, room_type: { hotel_id: hotelId } },
      include: { room_type: { select: { id: true, name: true } } },
    });

    if (!ratePlan) {
      throw new NotFoundError('Rate plan not found in this hotel');
    }

    const start = startDate ? normalizeToUtcMidnight(startDate) : normalizeToUtcMidnight(new Date());
    const end = endDate
      ? normalizeToUtcMidnight(endDate)
      : new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days default

    const overrides = await prisma.rateCalendar.findMany({
      where: {
        rate_plan_id: ratePlanId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    return {
      ratePlan: {
        id: ratePlan.id,
        name: ratePlan.name,
        basePriceCents: ratePlan.base_price_cents,
        roomType: ratePlan.room_type,
      },
      startDate: formatUtcDateString(start),
      endDate: formatUtcDateString(end),
      overrides: overrides.map((o) => ({
        id: o.id,
        date: formatUtcDateString(o.date),
        priceOverrideCents: o.price_override_cents,
        isAvailable: o.is_available,
      })),
    };
  }

  async setRateCalendarOverride(
    hotelId: string,
    ratePlanId: string,
    input: RateCalendarOverrideInput,
    managerUserId: string,
    ipAddress?: string
  ) {
    const ratePlan = await prisma.ratePlan.findFirst({
      where: { id: ratePlanId, room_type: { hotel_id: hotelId } },
    });

    if (!ratePlan) {
      throw new NotFoundError('Rate plan not found in this hotel');
    }

    const date = normalizeToUtcMidnight(input.date);

    const override = await prisma.rateCalendar.upsert({
      where: {
        rate_plan_id_date: {
          rate_plan_id: ratePlanId,
          date,
        },
      },
      update: {
        price_override_cents: input.priceOverrideCents,
        is_available: input.isAvailable,
      },
      create: {
        rate_plan_id: ratePlanId,
        date,
        price_override_cents: input.priceOverrideCents,
        is_available: input.isAvailable,
      },
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'RATE_CALENDAR_OVERRIDE_SET',
      entityType: 'RateCalendar',
      entityId: override.id,
      newState: override,
      ipAddress,
    });

    return {
      id: override.id,
      date: formatUtcDateString(override.date),
      priceOverrideCents: override.price_override_cents,
      isAvailable: override.is_available,
    };
  }

  async bulkSetRateCalendarOverrides(
    hotelId: string,
    ratePlanId: string,
    input: BulkRateCalendarOverrideInput,
    managerUserId: string,
    ipAddress?: string
  ) {
    const ratePlan = await prisma.ratePlan.findFirst({
      where: { id: ratePlanId, room_type: { hotel_id: hotelId } },
    });

    if (!ratePlan) {
      throw new NotFoundError('Rate plan not found in this hotel');
    }

    const start = normalizeToUtcMidnight(input.startDate);
    const end = normalizeToUtcMidnight(input.endDate);

    const dates: Date[] = [];
    const cur = new Date(start.getTime());
    while (cur.getTime() <= end.getTime()) {
      dates.push(new Date(cur.getTime()));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const operations = dates.map((d) =>
      prisma.rateCalendar.upsert({
        where: {
          rate_plan_id_date: {
            rate_plan_id: ratePlanId,
            date: d,
          },
        },
        update: {
          price_override_cents: input.priceOverrideCents,
          is_available: input.isAvailable,
        },
        create: {
          rate_plan_id: ratePlanId,
          date: d,
          price_override_cents: input.priceOverrideCents,
          is_available: input.isAvailable,
        },
      })
    );

    const results = await prisma.$transaction(operations);

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'RATE_CALENDAR_BULK_OVERRIDE_SET',
      entityType: 'RateCalendar',
      entityId: ratePlanId,
      newState: {
        startDate: input.startDate,
        endDate: input.endDate,
        datesCount: dates.length,
        priceOverrideCents: input.priceOverrideCents,
        isAvailable: input.isAvailable,
      },
      ipAddress,
    });

    return {
      success: true,
      updatedCount: results.length,
      startDate: formatUtcDateString(start),
      endDate: formatUtcDateString(end),
    };
  }
}

export const inventoryService = new InventoryService();

