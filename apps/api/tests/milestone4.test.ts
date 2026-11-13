// apps/api/tests/milestone4.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '@hbms/database';
import {
  ReservationStatus,
  AssignmentStatus,
  OperationalStatus,
  TaskStatus,
  MaintenanceStatus,
  HotelStatus,
  Role,
} from '@hbms/shared';

describe('Milestone 4: Front Desk, Room Assignment, Housekeeping & Admin', () => {
  const app = createApp();

  let adminToken: string;
  let managerParisToken: string;
  let managerTokyoToken: string;
  let receptionistParisToken: string;
  let receptionistParisUserId: string;
  let housekeepingParisToken: string;
  let housekeepingParisUserId: string;
  let guestToken: string;

  let hotelParisId: string;
  let hotelTokyoId: string;

  let roomTypeDeluxeId: string;
  let room101Id: string;
  let room102Id: string;
  let room103Id: string;
  let ratePlanId: string;

  beforeAll(async () => {
    // 1. Authenticate Platform Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hbms.com', password: 'Admin123!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // 2. Authenticate Paris Manager
    const managerParisLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.paris@grandluxe.com', password: 'Manager123!' });
    expect(managerParisLogin.status).toBe(200);
    managerParisToken = managerParisLogin.body.data.tokens.accessToken;
    hotelParisId = managerParisLogin.body.data.user.hotelId;

    // 3. Authenticate Tokyo Manager (for cross-property testing)
    const managerTokyoLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.tokyo@sakura.com', password: 'Manager123!' });
    expect(managerTokyoLogin.status).toBe(200);
    managerTokyoToken = managerTokyoLogin.body.data.tokens.accessToken;
    hotelTokyoId = managerTokyoLogin.body.data.user.hotelId;

    // 4. Authenticate Paris Receptionist & Housekeeping from seed
    const recEmail = 'receptionist.paris@grandluxe.com';
    let recLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: recEmail, password: 'Staff123!' });
    if (recLogin.status !== 200) {
      await request(app)
        .post('/api/v1/management/staff')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          email: recEmail,
          password: 'Staff123!',
          firstName: 'Pierre',
          lastName: 'Reception',
          role: Role.RECEPTIONIST,
        });
      recLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: recEmail, password: 'Staff123!' });
    }
    expect(recLogin.status).toBe(200);
    receptionistParisToken = recLogin.body.data.tokens.accessToken;
    receptionistParisUserId = recLogin.body.data.user.id;

    const hkEmail = 'housekeeping.paris@grandluxe.com';
    let hkLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: hkEmail, password: 'Staff123!' });
    if (hkLogin.status !== 200) {
      await request(app)
        .post('/api/v1/management/staff')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          email: hkEmail,
          password: 'Staff123!',
          firstName: 'Marie',
          lastName: 'Housekeeper',
          role: Role.HOUSEKEEPING,
        });
      hkLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: hkEmail, password: 'Staff123!' });
    }
    expect(hkLogin.status).toBe(200);
    housekeepingParisToken = hkLogin.body.data.tokens.accessToken;
    housekeepingParisUserId = hkLogin.body.data.user.id;

    // 5. Authenticate Guest
    const guestLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });
    expect(guestLogin.status).toBe(200);
    guestToken = guestLogin.body.data.tokens.accessToken;

    // 6. Query Paris rooms
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelParisId },
      include: {
        room_types: {
          include: {
            rate_plans: true,
            rooms: true,
          },
        },
      },
    });

    const rt = hotel!.room_types[0];
    roomTypeDeluxeId = rt.id;
    ratePlanId = rt.rate_plans[0].id;

    // Ensure we have at least 3 physical rooms for testing
    let rooms = await prisma.room.findMany({
      where: { hotel_id: hotelParisId, room_type_id: roomTypeDeluxeId },
    });

    if (rooms.length < 3) {
      const r1 = await prisma.room.create({
        data: {
          hotel: { connect: { id: hotelParisId } },
          room_type: { connect: { id: roomTypeDeluxeId } },
          room_number: `M4-101-${Date.now().toString().slice(-4)}`,
          floor: 1,
          operational_status: OperationalStatus.READY,
        },
      });
      const r2 = await prisma.room.create({
        data: {
          hotel: { connect: { id: hotelParisId } },
          room_type: { connect: { id: roomTypeDeluxeId } },
          room_number: `M4-102-${Date.now().toString().slice(-4)}`,
          floor: 1,
          operational_status: OperationalStatus.READY,
        },
      });
      const r3 = await prisma.room.create({
        data: {
          hotel: { connect: { id: hotelParisId } },
          room_type: { connect: { id: roomTypeDeluxeId } },
          room_number: `M4-103-${Date.now().toString().slice(-4)}`,
          floor: 1,
          operational_status: OperationalStatus.READY,
        },
      });
      rooms = [r1, r2, r3];
    }

    room101Id = rooms[0].id;
    room102Id = rooms[1].id;
    room103Id = rooms[2].id;

    // Reset test rooms to READY
    await prisma.room.updateMany({
      where: { id: { in: [room101Id, room102Id, room103Id] } },
      data: { operational_status: OperationalStatus.READY },
    });

    // Clean up test assignments, tasks, issues, payments, and reservations
    await prisma.roomAssignment.deleteMany({
      where: { room_id: { in: [room101Id, room102Id, room103Id] } },
    });
    await prisma.housekeepingTask.deleteMany({
      where: { room_id: { in: [room101Id, room102Id, room103Id] } },
    });
    await prisma.maintenanceIssue.deleteMany({
      where: { room_id: { in: [room101Id, room102Id, room103Id] } },
    });
    await prisma.refundRecord.deleteMany({
      where: { payment: { reservation: { hotel_id: hotelParisId } } },
    });
    await prisma.payment.deleteMany({
      where: { reservation: { hotel_id: hotelParisId } },
    });
    await prisma.roomAssignment.deleteMany({
      where: { reservation: { hotel_id: hotelParisId } },
    });
    await prisma.reservationRoom.deleteMany({
      where: { reservation: { hotel_id: hotelParisId } },
    });
    await prisma.reservation.deleteMany({
      where: { hotel_id: hotelParisId },
    });
  });

  // Helper to create a confirmed reservation
  async function createConfirmedReservation(quantity: number = 1, checkInOffsetDays: number = 0) {
    const today = new Date();
    const inDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + checkInOffsetDays, 0, 0, 0));
    const outDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + checkInOffsetDays + 2, 0, 0, 0));

    const checkInStr = inDate.toISOString().split('T')[0];
    const checkOutStr = outDate.toISOString().split('T')[0];

    const holdRes = await request(app)
      .post(`/api/v1/hotels/${hotelParisId}/holds`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        guestName: 'Eleanor Vance',
        guestEmail: 'eleanor.vance@example.com',
        guestPhone: '+33 6 98 76 54 32',
        rooms: [{ roomTypeId: roomTypeDeluxeId, ratePlanId, quantity }],
      });

    expect(holdRes.status).toBe(201);
    const hold = holdRes.body.data;

    // Confirm hold
    const confRes = await request(app)
      .post(`/api/v1/reservations/${hold.id}/confirm`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        idempotencyKey: `PAY-M4-${hold.id}-${Date.now()}`,
        paymentMethod: 'CARD',
      });

    expect(confRes.status).toBe(201);
    return confRes.body.data.reservation;
  }

  // ====================================================
  // 1. PHYSICAL ROOM ASSIGNMENT & REASSIGNMENT
  // ====================================================
  describe('Room Assignment & Slot Management', () => {
    it('assigns a physical room to a reservation slot', async () => {
      const res = await createConfirmedReservation(1, 0);
      const resRoom = res.rooms[0];

      const assignRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resRoom.id,
          slotIndex: 0,
          roomId: room101Id,
          notes: 'Near elevator preference',
        });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.room_id).toBe(room101Id);
      expect(assignRes.body.data.slot_index).toBe(0);
      expect(assignRes.body.data.status).toBe(AssignmentStatus.ACTIVE);
    });

    it('reassigns an existing slot to another physical room and releases the old assignment', async () => {
      const res = await createConfirmedReservation(1, 3);
      const resRoom = res.rooms[0];

      // Assign to room101
      await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resRoom.id,
          slotIndex: 0,
          roomId: room101Id,
        });

      // Reassign slot 0 to room102
      const reassignRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/reassign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resRoom.id,
          slotIndex: 0,
          newRoomId: room102Id,
          notes: 'Upgraded to courtyard view',
        });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.data.room_id).toBe(room102Id);

      // Verify old assignment on room101 is RELEASED with reason REASSIGNED
      const oldAssignment = await prisma.roomAssignment.findFirst({
        where: {
          reservation_room_id: resRoom.id,
          room_id: room101Id,
        },
      });
      expect(oldAssignment!.status).toBe(AssignmentStatus.RELEASED);
      expect(oldAssignment!.release_reason).toBe('REASSIGNED');
    });

    it('supports slot-based assignments for multi-room reservations', async () => {
      const multiRes = await createConfirmedReservation(2, 5);
      const resRoom = multiRes.rooms[0];
      expect(resRoom.quantity).toBe(2);

      // Assign slot 0 to room101
      const assign0 = await request(app)
        .post(`/api/v1/reception/reservations/${multiRes.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resRoom.id,
          slotIndex: 0,
          roomId: room101Id,
        });
      expect(assign0.status).toBe(201);

      // Assign slot 1 to room102
      const assign1 = await request(app)
        .post(`/api/v1/reception/reservations/${multiRes.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resRoom.id,
          slotIndex: 1,
          roomId: room102Id,
        });
      expect(assign1.status).toBe(201);

      // Verify both active assignments exist simultaneously
      const activeAssignments = await prisma.roomAssignment.findMany({
        where: {
          reservation_room_id: resRoom.id,
          status: AssignmentStatus.ACTIVE,
        },
      });
      expect(activeAssignments.length).toBe(2);
      expect(activeAssignments.map((a) => a.slot_index).sort()).toEqual([0, 1]);
    });

    it('rejects assignment when room has an overlapping active assignment on another reservation', async () => {
      const resA = await createConfirmedReservation(1, 10);
      const resB = await createConfirmedReservation(1, 10);

      // Assign room101 to ResA
      await request(app)
        .post(`/api/v1/reception/reservations/${resA.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resA.rooms[0].id,
          slotIndex: 0,
          roomId: room101Id,
        });

      // Attempt to assign the same room101 to ResB for overlapping dates
      const conflictRes = await request(app)
        .post(`/api/v1/reception/reservations/${resB.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: resB.rooms[0].id,
          slotIndex: 0,
          roomId: room101Id,
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.message).toContain('already assigned');
    }, 15000);
  });

  // ====================================================
  // 2. CHECK-IN VALIDATION & EXECUTION
  // ====================================================
  describe('Check-In Operations', () => {
    it('rejects check-in if rooms are not assigned', async () => {
      const res = await createConfirmedReservation(1, 14);

      const checkInRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/check-in`)
        .set('Authorization', `Bearer ${receptionistParisToken}`);

      expect(checkInRes.status).toBe(400);
      expect(checkInRes.body.error.message).toContain('requires 1 assigned room(s)');
    });

    it('rejects check-in if an assigned room is not READY (e.g. DIRTY or CLEANING)', async () => {
      const res = await createConfirmedReservation(1, 17);

      // Assign room103
      await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: res.rooms[0].id,
          slotIndex: 0,
          roomId: room103Id,
        });

      // Set room103 to DIRTY
      await prisma.room.update({
        where: { id: room103Id },
        data: { operational_status: OperationalStatus.DIRTY },
      });

      const checkInRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/check-in`)
        .set('Authorization', `Bearer ${receptionistParisToken}`);

      expect(checkInRes.status).toBe(400);
      expect(checkInRes.body.error.message).toContain('must be "READY"');
    });

    it('successfully checks in when all rooms are assigned and READY, marking rooms OCCUPIED', async () => {
      const res = await createConfirmedReservation(1, 20);

      // Ensure room103 is READY
      await prisma.room.update({
        where: { id: room103Id },
        data: { operational_status: OperationalStatus.READY },
      });

      // Assign room103
      await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: res.rooms[0].id,
          slotIndex: 0,
          roomId: room103Id,
        });

      // Execute check-in
      const checkInRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/check-in`)
        .set('Authorization', `Bearer ${receptionistParisToken}`);

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.success).toBe(true);
      expect(checkInRes.body.data.status).toBe(ReservationStatus.CHECKED_IN);

      // Verify room103 transitioned to OCCUPIED in database
      const roomInDb = await prisma.room.findUnique({
        where: { id: room103Id },
      });
      expect(roomInDb!.operational_status).toBe(OperationalStatus.OCCUPIED);
    });
  });

  // ====================================================
  // 3. CHECK-OUT & AUTOMATIC HOUSEKEEPING TASK CREATION
  // ====================================================
  describe('Check-Out Operations', () => {
    it('executes check-out, transitions rooms to DIRTY, and creates turnover housekeeping tasks', async () => {
      // 1. Create and check-in reservation on room103
      const res = await createConfirmedReservation(1, 23);
      await prisma.room.update({
        where: { id: room103Id },
        data: { operational_status: OperationalStatus.READY },
      });
      await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/assign`)
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          reservationRoomId: res.rooms[0].id,
          slotIndex: 0,
          roomId: room103Id,
        });
      await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/check-in`)
        .set('Authorization', `Bearer ${receptionistParisToken}`);

      // 2. Execute check-out
      const checkOutRes = await request(app)
        .post(`/api/v1/reception/reservations/${res.id}/check-out`)
        .set('Authorization', `Bearer ${receptionistParisToken}`);

      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.success).toBe(true);
      expect(checkOutRes.body.data.reservation.status).toBe(ReservationStatus.CHECKED_OUT);
      expect(checkOutRes.body.data.housekeepingTasksCreated).toBe(1);

      // 3. Verify room103 operational_status is now DIRTY
      const roomAfterCheckout = await prisma.room.findUnique({
        where: { id: room103Id },
      });
      expect(roomAfterCheckout!.operational_status).toBe(OperationalStatus.DIRTY);

      // 4. Verify HousekeepingTask created in DB
      const hkTask = await prisma.housekeepingTask.findFirst({
        where: { room_id: room103Id, status: TaskStatus.PENDING },
      });
      expect(hkTask).toBeDefined();
      expect(hkTask!.task_type).toBe('TURNOVER_CLEAN');
    });
  });

  // ====================================================
  // 4. HOUSEKEEPING WORKFLOW & INSPECTION AUTHORIZATION
  // ====================================================
  describe('Housekeeping Lifecycle & Inspection Authorization', () => {
    let turnoverTaskId: string;

    beforeAll(async () => {
      // Ensure room101 is DIRTY with a PENDING turnover task
      await prisma.room.update({
        where: { id: room101Id },
        data: { operational_status: OperationalStatus.DIRTY },
      });

      const task = await prisma.housekeepingTask.create({
        data: {
          hotel_id: hotelParisId,
          room_id: room101Id,
          task_type: 'TURNOVER_CLEAN',
          status: TaskStatus.PENDING,
          notes: 'Test turnover clean',
        },
      });
      turnoverTaskId = task.id;
    });

    it('cleaner starts cleaning: transitions task to IN_PROGRESS and room to CLEANING', async () => {
      const res = await request(app)
        .post(`/api/v1/housekeeping/tasks/${turnoverTaskId}/start`)
        .set('Authorization', `Bearer ${housekeepingParisToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);

      const room = await prisma.room.findUnique({ where: { id: room101Id } });
      expect(room!.operational_status).toBe(OperationalStatus.CLEANING);
    });

    it('cleaner completes cleaning: transitions task to AWAITING_INSPECTION and room to INSPECTION', async () => {
      const res = await request(app)
        .post(`/api/v1/housekeeping/tasks/${turnoverTaskId}/submit-inspection`)
        .set('Authorization', `Bearer ${housekeepingParisToken}`)
        .send({ notes: 'Linens replaced, bathroom sanitized' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.AWAITING_INSPECTION);

      const room = await prisma.room.findUnique({ where: { id: room101Id } });
      expect(room!.operational_status).toBe(OperationalStatus.INSPECTION);
    });

    it('forbids pure housekeeping cleaner from approving inspection without authorization', async () => {
      const res = await request(app)
        .post(`/api/v1/housekeeping/tasks/${turnoverTaskId}/approve-inspection`)
        .set('Authorization', `Bearer ${housekeepingParisToken}`);

      expect(res.status).toBe(403);
    });

    it('allows authorized manager/receptionist to approve inspection, marking room READY', async () => {
      const res = await request(app)
        .post(`/api/v1/housekeeping/tasks/${turnoverTaskId}/approve-inspection`)
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.COMPLETED);

      const room = await prisma.room.findUnique({ where: { id: room101Id } });
      expect(room!.operational_status).toBe(OperationalStatus.READY);
    });
  });

  // ====================================================
  // 5. MAINTENANCE ISSUE REPORTING & ROOM BLOCKING
  // ====================================================
  describe('Maintenance Issue Reporting', () => {
    let issueId: string;

    it('reports a maintenance issue and transitions room to MAINTENANCE', async () => {
      const res = await request(app)
        .post('/api/v1/housekeeping/issues')
        .set('Authorization', `Bearer ${housekeepingParisToken}`)
        .send({
          roomId: room102Id,
          title: 'HVAC Air Conditioning leak',
          description: 'Water dripping onto carpet from unit',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('HVAC Air Conditioning leak');
      issueId = res.body.data.id;

      const room = await prisma.room.findUnique({ where: { id: room102Id } });
      expect(room!.operational_status).toBe(OperationalStatus.MAINTENANCE);
    });

    it('resolves maintenance issue, setting room to DIRTY for cleaning', async () => {
      const res = await request(app)
        .patch(`/api/v1/housekeeping/issues/${issueId}/resolve`)
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(MaintenanceStatus.RESOLVED);

      const room = await prisma.room.findUnique({ where: { id: room102Id } });
      expect(room!.operational_status).toBe(OperationalStatus.DIRTY);
    });
  });

  // ====================================================
  // 6. WALK-IN BOOKINGS & INVENTORY CONCURRENCY
  // ====================================================
  describe('Walk-In Booking Workflow', () => {
    it('creates walk-in booking directly with instant confirmation and room assignment', async () => {
      const today = new Date();
      const inDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 15, 0, 0, 0));
      const outDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 17, 0, 0, 0));

      const res = await request(app)
        .post('/api/v1/reception/walk-in')
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .send({
          guestName: 'Walkin Guest',
          guestEmail: 'walkin.guest@example.com',
          guestPhone: '+33 6 00 11 22 33',
          checkInDate: inDate.toISOString().split('T')[0],
          checkOutDate: outDate.toISOString().split('T')[0],
          rooms: [
            {
              roomTypeId: roomTypeDeluxeId,
              ratePlanId,
              quantity: 1,
              assignedRoomIds: [room101Id],
            },
          ],
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(ReservationStatus.CONFIRMED);
      expect(res.body.data.is_walk_in).toBe(true);
      expect(res.body.data.payments.length).toBeGreaterThan(0);
      expect(res.body.data.payments[0].payment_method).toBe('CASH');

      // Verify room was assigned to slot 0
      const assignments = res.body.data.rooms[0].assignments;
      expect(assignments.length).toBe(1);
      expect(assignments[0].room_id).toBe(room101Id);
    });
  });

  // ====================================================
  // 7. CROSS-HOTEL AUTHORIZATION ENFORCEMENT
  // ====================================================
  describe('Cross-Hotel Authorization Scoping', () => {
    it('forbids staff from Paris accessing Tokyo reception arrivals', async () => {
      // Receptionist Paris requesting Tokyo hotel scope
      const res = await request(app)
        .get('/api/v1/reception/arrivals')
        .set('Authorization', `Bearer ${receptionistParisToken}`)
        .set('x-hotel-id', hotelTokyoId);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Access denied');
    });
  });

  // ====================================================
  // 8. HOTEL MANAGER DAILY OPERATIONS REPORTING
  // ====================================================
  describe('Manager Daily Operations Reporting', () => {
    it('generates daily operations report derived accurately from actual database records', async () => {
      const res = await request(app)
        .get('/api/v1/management/reports/daily')
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;
      expect(report.hotelName).toBeDefined();
      expect(report.currency).toBe('INR');
      expect(typeof report.inventory.totalRooms).toBe('number');
      expect(typeof report.inventory.occupancyRatePercent).toBe('number');
      expect(report.inventory.statusCounts).toBeDefined();
      expect(typeof report.revenue.dailyRevenueCents).toBe('number');
      expect(typeof report.frontDesk.arrivalsCount).toBe('number');
      expect(typeof report.frontDesk.departuresCount).toBe('number');
      expect(typeof report.housekeeping.tasksToday).toBe('number');
    });
  });

  // ====================================================
  // 9. PLATFORM ADMINISTRATION & HOTEL SUSPENSION
  // ====================================================
  describe('Platform Administration & Hotel Status Lifecycle', () => {
    it('lists all hotels with capacity metadata for platform admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/hotels')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('suspends and reactivates a hotel, recording an audit log event', async () => {
      // 1. Suspend Tokyo hotel
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/hotels/${hotelTokyoId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: HotelStatus.SUSPENDED,
          reason: 'Regulatory compliance review',
        });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe(HotelStatus.SUSPENDED);

      // Verify audit log created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          hotel_id: hotelTokyoId,
          action: 'HOTEL_SUSPENDED',
        },
        orderBy: { created_at: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog!.new_state).toContain('Regulatory compliance review');

      // 2. Reactivate Tokyo hotel
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/hotels/${hotelTokyoId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: HotelStatus.ACTIVE,
          reason: 'Compliance review completed and verified',
        });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.status).toBe(HotelStatus.ACTIVE);
    });

    it('retrieves global platform performance metrics across all hotels', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hotels.total).toBeGreaterThan(0);
      expect(res.body.data.inventory.totalRoomsAcrossPlatform).toBeGreaterThan(0);
      expect(res.body.data.financials.grossVolumeCents).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Teardown: Clean up operational test tasks, assignments, issues, payments, and reservations
    await prisma.housekeepingTask.deleteMany();
    await prisma.maintenanceIssue.deleteMany();
    await prisma.roomAssignment.deleteMany();
    await prisma.refundRecord.deleteMany();
    await prisma.cancellationRecord.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.reservationRoom.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.room.updateMany({
      data: { operational_status: OperationalStatus.READY },
    });
  });
});
