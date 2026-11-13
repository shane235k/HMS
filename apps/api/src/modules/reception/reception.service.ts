// apps/api/src/modules/reception/reception.service.ts
import { prisma } from '@hbms/database';
import {
  ReservationStatus,
  AssignmentStatus,
  OperationalStatus,
  TaskType,
  TaskStatus,
  PaymentStatus,
  AssignRoomInput,
  ReassignRoomInput,
  ReleaseRoomAssignmentInput,
  WalkInBookingInput,
} from '@hbms/shared';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors';
import { notificationsService } from '../notifications/notifications.service';
import {
  normalizeToUtcMidnight,
  availabilityService,
  generateReservationCode,
} from '../hotels/availability.service';

export class ReceptionService {
  /**
   * Lists expected arrivals for a specific date (default today).
   */
  async getArrivals(hotelId: string, dateStr?: string) {
    const targetDate = dateStr ? normalizeToUtcMidnight(dateStr) : normalizeToUtcMidnight(new Date());
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    return await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        check_in_date: {
          gte: targetDate,
          lt: nextDate,
        },
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
      },
      include: {
        rooms: {
          include: {
            room_type: { select: { id: true, name: true, bed_type: true } },
            rate_plan: { select: { id: true, name: true } },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: {
                room: { select: { id: true, room_number: true, floor: true, operational_status: true } },
              },
            },
          },
        },
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          take: 1,
        },
      },
      orderBy: { check_in_date: 'asc' },
    });
  }

  /**
   * Lists expected departures for a specific date (default today).
   */
  async getDepartures(hotelId: string, dateStr?: string) {
    const targetDate = dateStr ? normalizeToUtcMidnight(dateStr) : normalizeToUtcMidnight(new Date());
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    return await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        check_out_date: {
          gte: targetDate,
          lt: nextDate,
        },
        status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.CONFIRMED] },
      },
      include: {
        rooms: {
          include: {
            room_type: { select: { id: true, name: true } },
            rate_plan: { select: { id: true, name: true } },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: {
                room: { select: { id: true, room_number: true, floor: true, operational_status: true } },
              },
            },
          },
        },
      },
      orderBy: { check_out_date: 'asc' },
    });
  }

  /**
   * Returns aggregated check-ins and departures per date for a given month (YYYY-MM).
   */
  async getCalendarSchedule(hotelId: string, monthStr: string) {
    const [yearNum, monthNum] = monthStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0));

    const reservations = await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
        OR: [
          { check_in_date: { gte: startDate, lt: endDate } },
          { check_out_date: { gte: startDate, lt: endDate } },
        ],
      },
      select: {
        id: true,
        check_in_date: true,
        check_out_date: true,
        status: true,
      },
    });

    const dayCounts: Record<string, { checkins: number; departures: number; total: number }> = {};

    for (const res of reservations) {
      const inDateKey = res.check_in_date.toISOString().split('T')[0];
      const outDateKey = res.check_out_date.toISOString().split('T')[0];

      if (res.check_in_date >= startDate && res.check_in_date < endDate) {
        if (!dayCounts[inDateKey]) {
          dayCounts[inDateKey] = { checkins: 0, departures: 0, total: 0 };
        }
        dayCounts[inDateKey].checkins += 1;
        dayCounts[inDateKey].total += 1;
      }

      if (res.check_out_date >= startDate && res.check_out_date < endDate) {
        if (!dayCounts[outDateKey]) {
          dayCounts[outDateKey] = { checkins: 0, departures: 0, total: 0 };
        }
        dayCounts[outDateKey].departures += 1;
        dayCounts[outDateKey].total += 1;
      }
    }

    return dayCounts;
  }

  /**
   * Lists in-house guests currently checked into rooms.
   */
  async getInHouse(hotelId: string) {
    return await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        status: ReservationStatus.CHECKED_IN,
      },
      include: {
        rooms: {
          include: {
            room_type: { select: { id: true, name: true } },
            rate_plan: { select: { id: true, name: true } },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: {
                room: { select: { id: true, room_number: true, floor: true, operational_status: true } },
              },
            },
          },
        },
      },
      orderBy: { check_in_date: 'asc' },
    });
  }

  /**
   * Fast search across booking reference code, guest name, email, or phone.
   */
  async searchReservations(hotelId: string, query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    return await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        OR: [
          { reservation_code: { contains: cleanQuery, mode: 'insensitive' } },
          { guest_name: { contains: cleanQuery, mode: 'insensitive' } },
          { guest_email: { contains: cleanQuery, mode: 'insensitive' } },
          { guest_phone: { contains: cleanQuery } },
        ],
      },
      include: {
        rooms: {
          include: {
            room_type: { select: { id: true, name: true } },
            rate_plan: { select: { id: true, name: true } },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: {
                room: { select: { id: true, room_number: true, floor: true, operational_status: true } },
              },
            },
          },
        },
      },
      orderBy: { check_in_date: 'desc' },
      take: 25,
    });
  }

  /**
   * Assigns a physical room to a specific slot of a ReservationRoom.
   * Verifies room validity, maintenance blocks, overlapping reservations, and coordinates OCC via Room.version.
   */
  async assignRoom(
    hotelId: string,
    reservationId: string,
    input: AssignRoomInput,
    staffUserId?: string
  ) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, hotel_id: hotelId },
      include: {
        rooms: {
          include: {
            room_type: true,
            assignments: { where: { status: AssignmentStatus.ACTIVE } },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found for this hotel');
    }

    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.CHECKED_IN
    ) {
      throw new BadRequestError(
        `Cannot assign room: reservation is currently in status "${reservation.status}"`
      );
    }

    const reservationRoom = reservation.rooms.find((r) => r.id === input.reservationRoomId);
    if (!reservationRoom) {
      throw new NotFoundError('ReservationRoom line item not found on this reservation');
    }

    if (input.slotIndex < 0 || input.slotIndex >= reservationRoom.quantity) {
      throw new BadRequestError(
        `Slot index ${input.slotIndex} is invalid. Valid slots are 0 to ${reservationRoom.quantity - 1}.`
      );
    }

    // Verify target physical room
    const targetRoom = await prisma.room.findUnique({
      where: { id: input.roomId },
      include: { room_type: true },
    });

    if (!targetRoom || targetRoom.hotel_id !== hotelId) {
      throw new NotFoundError('Target room not found in this hotel');
    }

    if (!targetRoom.is_active) {
      throw new BadRequestError(`Room ${targetRoom.room_number} is inactive`);
    }

    if (targetRoom.room_type_id !== reservationRoom.room_type_id) {
      throw new ConflictError(
        `Room type mismatch: Room ${targetRoom.room_number} is "${targetRoom.room_type.name}", but reservation requires "${reservationRoom.room_type.name}".`
      );
    }

    // Check maintenance blocks on target room
    const overlappingBlock = await prisma.roomBlock.findFirst({
      where: {
        room_id: targetRoom.id,
        start_date: { lt: reservation.check_out_date },
        end_date: { gt: reservation.check_in_date },
      },
    });

    if (overlappingBlock) {
      throw new ConflictError(
        `Room ${targetRoom.room_number} is blocked for maintenance from ${overlappingBlock.start_date.toISOString().split('T')[0]} to ${overlappingBlock.end_date.toISOString().split('T')[0]} (${overlappingBlock.reason}).`
      );
    }

    // Check conflicting active room assignments for overlapping stay dates
    const overlappingAssignments = await prisma.roomAssignment.findMany({
      where: {
        room_id: targetRoom.id,
        status: AssignmentStatus.ACTIVE,
        reservation_id: { not: reservation.id },
      },
      include: {
        reservation: {
          select: { id: true, reservation_code: true, check_in_date: true, check_out_date: true, status: true },
        },
      },
    });

    for (const oa of overlappingAssignments) {
      if (
        oa.reservation.status === ReservationStatus.CONFIRMED ||
        oa.reservation.status === ReservationStatus.CHECKED_IN
      ) {
        if (
          oa.reservation.check_in_date < reservation.check_out_date &&
          oa.reservation.check_out_date > reservation.check_in_date
        ) {
          throw new ConflictError(
            `Room ${targetRoom.room_number} is already assigned to reservation ${oa.reservation.reservation_code} for overlapping dates (${oa.reservation.check_in_date.toISOString().split('T')[0]} to ${oa.reservation.check_out_date.toISOString().split('T')[0]}).`
          );
        }
      }
    }

    // Execute Assignment in Transaction with Room.version OCC guard
    return await prisma.$transaction(async (tx) => {
      // 1. Check if a slot assignment already exists for this slot
      const existingSlotAssignment = await tx.roomAssignment.findFirst({
        where: {
          reservation_room_id: reservationRoom.id,
          slot_index: input.slotIndex,
          status: AssignmentStatus.ACTIVE,
        },
      });

      if (existingSlotAssignment) {
        if (existingSlotAssignment.room_id === targetRoom.id) {
          return existingSlotAssignment; // Already assigned to this exact room
        }
        // Reassignment: release existing assignment
        await tx.roomAssignment.update({
          where: { id: existingSlotAssignment.id },
          data: {
            status: AssignmentStatus.RELEASED,
            released_at: new Date(),
            release_reason: 'REASSIGNED',
          },
        });
      }

      // 2. Increment Room version (OCC guard)
      await tx.room.update({
        where: { id: targetRoom.id },
        data: { version: { increment: 1 } },
      });

      // 3. Create new active assignment
      const newAssignment = await tx.roomAssignment.create({
        data: {
          reservation: { connect: { id: reservation.id } },
          reservation_room: { connect: { id: reservationRoom.id } },
          slot_index: input.slotIndex,
          room: { connect: { id: targetRoom.id } },
          assigned_by: staffUserId ? { connect: { id: staffUserId } } : undefined,
          status: AssignmentStatus.ACTIVE,
          notes: input.notes || null,
        },
        include: {
          room: { select: { id: true, room_number: true, floor: true, operational_status: true } },
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          hotel_id: hotelId,
          actor_id: staffUserId || null,
          actor_role: 'STAFF',
          action: 'ROOM_ASSIGNED',
          entity_type: 'RoomAssignment',
          entity_id: newAssignment.id,
          new_state: `Room ${targetRoom.room_number} assigned to ${reservation.reservation_code} slot ${input.slotIndex}`,
        },
      });

      return newAssignment;
    });
  }

  /**
   * Reassigns a slot to a new physical room.
   */
  async reassignRoom(
    hotelId: string,
    reservationId: string,
    input: ReassignRoomInput,
    staffUserId?: string
  ) {
    return await this.assignRoom(
      hotelId,
      reservationId,
      {
        reservationRoomId: input.reservationRoomId,
        slotIndex: input.slotIndex,
        roomId: input.newRoomId,
        notes: input.notes,
      },
      staffUserId
    );
  }

  /**
   * Releases an active room assignment for a slot.
   */
  async releaseRoomAssignment(
    hotelId: string,
    reservationId: string,
    input: ReleaseRoomAssignmentInput,
    staffUserId?: string
  ) {
    const assignment = await prisma.roomAssignment.findFirst({
      where: {
        reservation_id: reservationId,
        reservation_room_id: input.reservationRoomId,
        slot_index: input.slotIndex,
        status: AssignmentStatus.ACTIVE,
      },
      include: { room: true },
    });

    if (!assignment) {
      throw new NotFoundError('No active room assignment found for this slot');
    }

    const released = await prisma.roomAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.RELEASED,
        released_at: new Date(),
        release_reason: input.reason || 'MANUAL_RELEASE',
      },
    });

    await prisma.auditLog.create({
      data: {
        hotel_id: hotelId,
        actor_id: staffUserId || null,
        actor_role: 'STAFF',
        action: 'ROOM_RELEASED',
        entity_type: 'RoomAssignment',
        entity_id: assignment.id,
        new_state: `Room ${assignment.room.room_number} released (${input.reason || 'MANUAL_RELEASE'})`,
      },
    });

    return released;
  }

  /**
   * Executes Guest Check-In.
   * Validates that EVERY required room is assigned and in READY operational status.
   * Transitions assigned rooms to OCCUPIED.
   */
  async checkIn(hotelId: string, reservationId: string, staffUserId?: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, hotel_id: hotelId },
      include: {
        rooms: {
          include: {
            room_type: true,
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: { room: true },
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      throw new BadRequestError('Guest is already checked in to this reservation');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestError(
        `Cannot check in: Reservation must be in CONFIRMED status (current: "${reservation.status}")`
      );
    }

    // 1. Verify every required room is assigned
    const assignedRooms: any[] = [];
    for (const rr of reservation.rooms) {
      if (rr.assignments.length < rr.quantity) {
        throw new BadRequestError(
          `Cannot check in: Room category "${rr.room_type.name}" requires ${rr.quantity} assigned room(s), but only ${rr.assignments.length} is assigned.`
        );
      }
      for (const a of rr.assignments) {
        assignedRooms.push(a.room);
      }
    }

    // 2. Verify EVERY assigned room is READY
    for (const room of assignedRooms) {
      if (room.operational_status !== OperationalStatus.READY) {
        throw new BadRequestError(
          `Cannot check in: Assigned room ${room.room_number} is currently "${room.operational_status}". Every room must be "READY" for check-in.`
        );
      }
    }

    // 3. Atomic Transaction: Check in reservation and transition rooms to OCCUPIED
    return await prisma.$transaction(async (tx) => {
      // Transition assigned rooms to OCCUPIED
      for (const room of assignedRooms) {
        await tx.room.update({
          where: { id: room.id },
          data: {
            operational_status: OperationalStatus.OCCUPIED,
            version: { increment: 1 },
          },
        });
      }

      // Update reservation status
      const updatedRes = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CHECKED_IN },
        include: {
          rooms: {
            include: {
              room_type: { select: { id: true, name: true } },
              assignments: {
                where: { status: AssignmentStatus.ACTIVE },
                include: { room: { select: { id: true, room_number: true, floor: true, operational_status: true } } },
              },
            },
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          hotel_id: hotelId,
          actor_id: staffUserId || null,
          actor_role: 'STAFF',
          action: 'CHECK_IN',
          entity_type: 'Reservation',
          entity_id: reservation.id,
          new_state: `Checked in ${reservation.reservation_code}. Rooms: ${assignedRooms.map((r) => r.room_number).join(', ')} set to OCCUPIED`,
        },
      });

      return updatedRes;
    });
  }

  /**
   * Executes Guest Check-Out.
   * Automatically transitions occupied rooms to DIRTY and generates Housekeeping turnover tasks.
   * Releases room assignments.
   */
  async checkOut(hotelId: string, reservationId: string, staffUserId?: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, hotel_id: hotelId },
      include: {
        hotel: { select: { id: true, name: true } },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: { room: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestError(
        `Cannot check out: Reservation must be currently CHECKED_IN (current status: "${reservation.status}")`
      );
    }

    // Atomic Transaction: Check out, transition rooms to DIRTY, create Housekeeping tasks, release assignments
    const result = await prisma.$transaction(async (tx) => {
      const housekeepingTasks: any[] = [];

      for (const assignment of reservation.assignments) {
        // 1. Transition room to DIRTY
        await tx.room.update({
          where: { id: assignment.room_id },
          data: {
            operational_status: OperationalStatus.DIRTY,
            version: { increment: 1 },
          },
        });

        // 2. Generate turnover clean housekeeping task
        const task = await tx.housekeepingTask.create({
          data: {
            hotel_id: hotelId,
            room_id: assignment.room_id,
            task_type: TaskType.TURNOVER_CLEAN,
            status: TaskStatus.PENDING,
            notes: `Automatic turnover clean on checkout for reservation ${reservation.reservation_code}`,
          },
        });
        housekeepingTasks.push(task);

        // 3. Release room assignment
        await tx.roomAssignment.update({
          where: { id: assignment.id },
          data: {
            status: AssignmentStatus.RELEASED,
            released_at: new Date(),
            release_reason: 'CHECKED_OUT',
          },
        });
      }

      // 4. Update reservation status to CHECKED_OUT
      const updatedRes = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CHECKED_OUT },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          hotel_id: hotelId,
          actor_id: staffUserId || null,
          actor_role: 'STAFF',
          action: 'CHECK_OUT',
          entity_type: 'Reservation',
          entity_id: reservation.id,
          new_state: `Checked out ${reservation.reservation_code}. Rooms set to DIRTY, ${housekeepingTasks.length} turnover tasks created.`,
        },
      });

      return {
        reservation: updatedRes,
        housekeepingTasksCreated: housekeepingTasks.length,
      };
    });

    // Dispatch checkout complete & rate stay notification
    if (reservation.guest_user_id) {
      notificationsService.createNotification({
        userId: reservation.guest_user_id,
        title: 'Checkout Complete & Rate Your Stay',
        message: `Thank you for staying at ${reservation.hotel?.name || 'our hotel'}! We hope you enjoyed your visit. Please rate your stay.`,
        type: 'CHECKOUT_COMPLETE',
        link: `/hotels/${reservation.hotel_id}?review=true&reservationId=${reservation.id}`,
        metadata: {
          hotelId: reservation.hotel_id,
          hotelName: reservation.hotel?.name,
          reservationId: reservation.id,
          reservationCode: reservation.reservation_code,
        },
      }).catch((err) => console.error('Failed to dispatch checkout review notification:', err));
    }

    return result;
  }

  /**
   * Walk-In Booking Workflow.
   * Uses the same availability engine and concurrency version guards as online bookings.
   * Immediately confirms the booking and optionally assigns physical rooms.
   */
  async createWalkIn(
    hotelId: string,
    input: WalkInBookingInput,
    staffUserId?: string
  ) {
    // 1. Create a hold with is_walk_in flag
    const holdResult = await availabilityService.createTemporaryHold(
      hotelId,
      {
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        rooms: input.rooms.map((r) => ({
          roomTypeId: r.roomTypeId,
          ratePlanId: r.ratePlanId,
          quantity: r.quantity,
        })),
        idempotencyKey: input.idempotencyKey || `WALKIN-HOLD-${Date.now()}`,
      },
      undefined
    );

    const hold = holdResult.reservation;

    // 2. Direct Confirmation & Payment capture
    const paymentKey = `WALKIN-PAY-${hold.id}-${Date.now()}`;
    const confirmedResult = await prisma.$transaction(async (tx) => {
      // Record payment
      const payment = await tx.payment.create({
        data: {
          reservation: { connect: { id: hold.id } },
          idempotency_key: paymentKey,
          transaction_reference: `WALKIN-TXN-${Date.now()}`,
          payment_provider: 'FRONT_DESK',
          payment_method: input.paymentMethod || 'CASH',
          amount_cents: hold.total_cents,
          currency: hold.currency,
          status: PaymentStatus.SUCCESS,
        },
      });

      // Confirm reservation
      const res = await tx.reservation.update({
        where: { id: hold.id },
        data: {
          status: ReservationStatus.CONFIRMED,
          is_walk_in: true,
          hold_expires_at: null,
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

      return { res, payment };
    });

    // 3. If physical rooms were requested to be assigned immediately:
    for (const requestedRoom of input.rooms) {
      if (requestedRoom.assignedRoomIds && requestedRoom.assignedRoomIds.length > 0) {
        const matchingResRoom = confirmedResult.res.rooms.find(
          (r) => r.room_type_id === requestedRoom.roomTypeId
        );
        if (matchingResRoom) {
          for (let i = 0; i < requestedRoom.assignedRoomIds.length; i++) {
            await this.assignRoom(
              hotelId,
              confirmedResult.res.id,
              {
                reservationRoomId: matchingResRoom.id,
                slotIndex: i,
                roomId: requestedRoom.assignedRoomIds[i],
              },
              staffUserId
            );
          }
        }
      }
    }

    return await prisma.reservation.findUnique({
      where: { id: confirmedResult.res.id },
      include: {
        rooms: {
          include: {
            room_type: true,
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: { room: true },
            },
          },
        },
        payments: true,
      },
    });
  }
}

export const receptionService = new ReceptionService();

