// apps/api/tests/milestone2.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '@hbms/database';
import { OperationalStatus, ReservationStatus } from '@hbms/shared';

describe('Milestone 2: Inventory, Rates, Availability & Concurrency', () => {
  const app = createApp();

  let adminToken: string;
  let managerParisToken: string;
  let managerTokyoToken: string;
  let guestToken: string;

  let hotelParisId: string;
  let hotelTokyoId: string;

  let testRoomTypeId: string;
  let testRatePlanId: string;
  let testRoom1Id: string;
  let testRoom2Id: string;

  beforeAll(async () => {
    // 1. Authenticate users from seed data
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hbms.com', password: 'Admin123!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    const managerParisLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.paris@grandluxe.com', password: 'Manager123!' });
    expect(managerParisLogin.status).toBe(200);
    managerParisToken = managerParisLogin.body.data.tokens.accessToken;
    hotelParisId = managerParisLogin.body.data.user.hotelId;

    const managerTokyoLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.tokyo@sakura.com', password: 'Manager123!' });
    expect(managerTokyoLogin.status).toBe(200);
    managerTokyoToken = managerTokyoLogin.body.data.tokens.accessToken;
    hotelTokyoId = managerTokyoLogin.body.data.user.hotelId;

    const guestLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });
    expect(guestLogin.status).toBe(200);
    guestToken = guestLogin.body.data.tokens.accessToken;

    // Clean up any test records from prior runs
    await prisma.roomBlock.deleteMany({
      where: { reason: { contains: 'Penthouse' } },
    });
    await prisma.room.deleteMany({
      where: { room_number: { in: ['PH-01', 'PH-02'] } },
    });
    await prisma.reservation.deleteMany({
      where: {
        OR: [
          { reservation_code: { startsWith: 'EXP-HOLD' } },
          { reservation_code: { startsWith: 'RES-TOUCH' } },
          { guest_name: { contains: 'Concurrent' } },
          { guest_name: { contains: 'Idempotency' } },
          { guest_name: { contains: 'Eleanor' } },
        ],
      },
    });
    await prisma.roomType.deleteMany({
      where: { name: 'Executive Seine Penthouse' },
    });
  });

  // ====================================================
  // 1. ROOM TYPE MANAGEMENT
  // ====================================================
  describe('Room Type Management', () => {
    it('allows hotel manager to create a new room type with base pricing', async () => {
      const res = await request(app)
        .post('/api/v1/management/room-types')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          name: 'Executive Seine Penthouse',
          description: 'Top floor luxury penthouse with panoramic Eiffel tower vistas',
          maxGuests: 4,
          maxAdults: 2,
          maxChildren: 2,
          bedType: '1 King + 1 Queen',
          roomSizeSqm: 110.5,
          amenities: ['Private Elevator', 'Rooftop Terrace', 'Champagne Bar', 'Whirlpool'],
          images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'],
          basePriceCents: 125000, // €1,250.00
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Executive Seine Penthouse');
      expect(res.body.data.rate_plans.length).toBeGreaterThan(0);
      expect(res.body.data.rate_plans[0].base_price_cents).toBe(125000);

      testRoomTypeId = res.body.data.id;
      testRatePlanId = res.body.data.rate_plans[0].id;
    });

    it('rejects duplicate room type name in the same hotel', async () => {
      const res = await request(app)
        .post('/api/v1/management/room-types')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          name: 'Executive Seine Penthouse',
          maxGuests: 2,
        });

      expect(res.status).toBe(409);
    });

    it('allows editing room type details and coordinates through OCC version', async () => {
      const res = await request(app)
        .put(`/api/v1/management/room-types/${testRoomTypeId}`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          description: 'Updated top floor luxury penthouse with private butler',
          roomSizeSqm: 115.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated top floor luxury penthouse with private butler');
      expect(res.body.data.room_size_sqm).toBe(115.0);
      expect(res.body.data.version).toBeGreaterThan(0);
    });

    it('allows deactivating and reactivating a room type', async () => {
      const deactivateRes = await request(app)
        .patch(`/api/v1/management/room-types/${testRoomTypeId}/status`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data.is_active).toBe(false);

      const activateRes = await request(app)
        .patch(`/api/v1/management/room-types/${testRoomTypeId}/status`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({ isActive: true });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.is_active).toBe(true);
    });
  });

  // ====================================================
  // 2. PHYSICAL ROOM MANAGEMENT & MAINTENANCE BLOCKS
  // ====================================================
  describe('Physical Room Management & Maintenance Blocks', () => {
    it('creates individual physical rooms under a room type', async () => {
      const res1 = await request(app)
        .post('/api/v1/management/rooms')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          roomTypeId: testRoomTypeId,
          roomNumber: 'PH-01',
          floor: 5,
          operationalStatus: OperationalStatus.READY,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.room_number).toBe('PH-01');
      testRoom1Id = res1.body.data.id;

      const res2 = await request(app)
        .post('/api/v1/management/rooms')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          roomTypeId: testRoomTypeId,
          roomNumber: 'PH-02',
          floor: 5,
          operationalStatus: OperationalStatus.READY,
        });

      expect(res2.status).toBe(201);
      testRoom2Id = res2.body.data.id;
    });

    it('enforces room number uniqueness within the same hotel', async () => {
      const res = await request(app)
        .post('/api/v1/management/rooms')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          roomTypeId: testRoomTypeId,
          roomNumber: 'PH-01',
          floor: 5,
        });

      expect(res.status).toBe(409);
    });

    it('allows updating room operational status', async () => {
      const res = await request(app)
        .patch(`/api/v1/management/rooms/${testRoom1Id}/status`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({ operationalStatus: OperationalStatus.CLEANING });

      expect(res.status).toBe(200);
      expect(res.body.data.operational_status).toBe(OperationalStatus.CLEANING);

      // Revert to READY
      await request(app)
        .patch(`/api/v1/management/rooms/${testRoom1Id}/status`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({ operationalStatus: OperationalStatus.READY });
    });

    it('creates a date-range maintenance block coordinating through Room.version and RoomType.version', async () => {
      const blockRes = await request(app)
        .post(`/api/v1/management/rooms/${testRoom1Id}/blocks`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          startDate: '2026-12-10',
          endDate: '2026-12-12', // 2 nights: 10th and 11th
          reason: 'Scheduled Penthouse HVAC Inspection and Polish',
        });

      expect(blockRes.status).toBe(201);
      expect(blockRes.body.data.room_id).toBe(testRoom1Id);
      expect(blockRes.body.data.reason).toBe('Scheduled Penthouse HVAC Inspection and Polish');

      const blockId = blockRes.body.data.id;

      // Delete block to verify unblocking
      const deleteRes = await request(app)
        .delete(`/api/v1/management/blocks/${blockId}`)
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  // ====================================================
  // 3. RATE MANAGEMENT & CALENDAR OVERRIDES
  // ====================================================
  describe('Rate Management & Calendar Overrides', () => {
    let seasonalRatePlanId: string;

    it('creates additional rate plans with cancellation policies', async () => {
      const res = await request(app)
        .post('/api/v1/management/rate-plans')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          roomTypeId: testRoomTypeId,
          name: 'Non-Refundable Early Bird',
          description: 'Save 15% with prepaid non-refundable rate',
          basePriceCents: 106250, // €1,062.50
          cancellationPolicy: 'NON_REFUNDABLE',
          cancellationDeadlineHours: 0,
          isDefault: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Non-Refundable Early Bird');
      seasonalRatePlanId = res.body.data.id;
    });

    it('applies date-specific rate calendar override and supports fallback', async () => {
      // Set override for New Year's Eve
      const overrideRes = await request(app)
        .post(`/api/v1/management/rate-plans/${testRatePlanId}/calendar`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          date: '2026-12-31',
          priceOverrideCents: 180000, // Peak €1,800.00
          isAvailable: true,
        });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.data.priceOverrideCents).toBe(180000);

      // Verify calendar inspection
      const calRes = await request(app)
        .get(`/api/v1/management/rate-plans/${testRatePlanId}/calendar?startDate=2026-12-30&endDate=2027-01-02`)
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(calRes.status).toBe(200);
      const dec31 = calRes.body.data.overrides.find((o: any) => o.date === '2026-12-31');
      expect(dec31).toBeDefined();
      expect(dec31.priceOverrideCents).toBe(180000);
    });

    it('supports bulk calendar overrides', async () => {
      const bulkRes = await request(app)
        .post(`/api/v1/management/rate-plans/${testRatePlanId}/calendar/bulk`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          startDate: '2026-12-24',
          endDate: '2026-12-26',
          priceOverrideCents: 150000,
          isAvailable: true,
        });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.data.updatedCount).toBe(3);
    });
  });

  // ====================================================
  // 4. NIGHT-BY-NIGHT AVAILABILITY CALCULATION
  // ====================================================
  describe('Availability Search Calculation', () => {
    it('returns normal availability when inventory is open', async () => {
      const res = await request(app)
        .get(`/api/v1/hotels/${hotelParisId}/availability?checkInDate=2026-12-01&checkOutDate=2026-12-04&rooms=1`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalNights).toBe(3);

      const penthouse = res.body.data.roomTypes.find((r: any) => r.roomTypeId === testRoomTypeId);
      expect(penthouse).toBeDefined();
      // 2 physical rooms exist
      expect(penthouse.availableQuantity).toBe(2);
      expect(penthouse.ratePlans.length).toBeGreaterThan(0);
    });

    it('calculates partial availability across multiple nights (minimum rule)', async () => {
      // Add maintenance block on night 2026-12-02 only for Room 1 via API
      const blockRes = await request(app)
        .post(`/api/v1/management/rooms/${testRoom1Id}/blocks`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          startDate: '2026-12-02',
          endDate: '2026-12-03', // exactly 1 night
          reason: 'Curtain replacement',
        });
      expect(blockRes.status).toBe(201);
      const blockId = blockRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/hotels/${hotelParisId}/availability?checkInDate=2026-12-01&checkOutDate=2026-12-04`);

      const penthouse = res.body.data.roomTypes.find((r: any) => r.roomTypeId === testRoomTypeId);
      // Night 12-01: 2 available
      // Night 12-02: 1 available (due to block)
      // Night 12-03: 2 available
      // Minimum across stay = 1
      expect(penthouse.availableQuantity).toBe(1);

      // Clean up block
      await request(app)
        .delete(`/api/v1/management/blocks/${blockId}`)
        .set('Authorization', `Bearer ${managerParisToken}`);
    });

    it('ignores expired temporary holds during availability calculation', async () => {
      // Create an expired temporary hold in the past
      const expiredHold = await prisma.reservation.create({
        data: {
          reservation_code: 'EXP-HOLD-001',
          hotel: { connect: { id: hotelParisId } },
          guest_name: 'Expired Guest',
          guest_email: 'expired@example.com',
          guest_phone: '+1 555-0199',
          check_in_date: new Date('2026-12-01T00:00:00.000Z'),
          check_out_date: new Date('2026-12-04T00:00:00.000Z'),
          total_rooms_count: 2,
          status: ReservationStatus.TEMPORARY_HOLD,
          hold_expires_at: new Date(Date.now() - 60000), // Expired 1 minute ago!
          subtotal_cents: 250000,
          tax_cents: 25000,
          fees_cents: 0,
          total_cents: 275000,
          currency: 'EUR',
          rooms: {
            create: [
              {
                room_type: { connect: { id: testRoomTypeId } },
                rate_plan: { connect: { id: testRatePlanId } },
                quantity: 2, // Would take both rooms if active
                nightly_rate_cents: 125000,
                total_price_cents: 250000,
              },
            ],
          },
        },
      });

      const res = await request(app)
        .get(`/api/v1/hotels/${hotelParisId}/availability?checkInDate=2026-12-01&checkOutDate=2026-12-04`);

      const penthouse = res.body.data.roomTypes.find((r: any) => r.roomTypeId === testRoomTypeId);
      // Should STILL have 2 rooms available because the hold is expired!
      expect(penthouse.availableQuantity).toBe(2);

      await prisma.reservation.delete({ where: { id: expiredHold.id } });
    });

    it('accounts for touching check-in / check-out dates without collision', async () => {
      // Reservation A: Dec 01 to Dec 03
      const resA = await prisma.reservation.create({
        data: {
          reservation_code: 'RES-TOUCH-A',
          hotel: { connect: { id: hotelParisId } },
          guest_name: 'Guest A',
          guest_email: 'a@example.com',
          guest_phone: '+1 555-0101',
          check_in_date: new Date('2026-12-01T00:00:00.000Z'),
          check_out_date: new Date('2026-12-03T00:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
          subtotal_cents: 250000,
          tax_cents: 25000,
          fees_cents: 0,
          total_cents: 275000,
          currency: 'EUR',
          rooms: {
            create: [
              {
                room_type: { connect: { id: testRoomTypeId } },
                rate_plan: { connect: { id: testRatePlanId } },
                quantity: 2,
                nightly_rate_cents: 125000,
                total_price_cents: 250000,
              },
            ],
          },
        },
      });

      // Guest B searches starting Dec 03 to Dec 05 (checking in exactly when Guest A checks out)
      const res = await request(app)
        .get(`/api/v1/hotels/${hotelParisId}/availability?checkInDate=2026-12-03&checkOutDate=2026-12-05`);

      const penthouse = res.body.data.roomTypes.find((r: any) => r.roomTypeId === testRoomTypeId);
      // Should be fully available (2 rooms) on Dec 03 night because Guest A checked out on Dec 03 morning!
      expect(penthouse.availableQuantity).toBe(2);

      await prisma.reservation.delete({ where: { id: resA.id } });
    });
  });

  // ====================================================
  // 5. TEMPORARY HOLDS & CONCURRENCY
  // ====================================================
  describe('Temporary Holds & Concurrency Protection', () => {
    it('rejects unauthenticated temporary hold requests with 401 Unauthorized', async () => {
      const unauthRes = await request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .send({
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-18',
          guestName: 'Unauthenticated Visitor',
          guestEmail: 'unauth@example.com',
          guestPhone: '+1 555-0199',
          rooms: [
            {
              roomTypeId: testRoomTypeId,
              ratePlanId: testRatePlanId,
              quantity: 1,
            },
          ],
        });

      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.success).toBe(false);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('creates an active temporary hold with 15-minute expiration timestamp', async () => {
      const holdRes = await request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-18',
          guestName: 'Eleanor Vance',
          guestEmail: 'eleanor@example.com',
          guestPhone: '+1 555-0144',
          rooms: [
            {
              roomTypeId: testRoomTypeId,
              ratePlanId: testRatePlanId,
              quantity: 1,
            },
          ],
        });

      expect(holdRes.status).toBe(201);
      expect(holdRes.body.success).toBe(true);
      expect(holdRes.body.data.status).toBe('TEMPORARY_HOLD');
      expect(holdRes.body.data.reservation_code).toMatch(/^RES-[A-Z0-9]{6}$/);

      const holdExpiresAt = new Date(holdRes.body.data.hold_expires_at).getTime();
      const expectedMinExpires = Date.now() + 14 * 60 * 1000;
      expect(holdExpiresAt).toBeGreaterThan(expectedMinExpires);

      // Verify availability is decremented from 2 to 1 for those dates
      const availRes = await request(app)
        .get(`/api/v1/hotels/${hotelParisId}/availability?checkInDate=2026-12-15&checkOutDate=2026-12-18`);

      const penthouse = availRes.body.data.roomTypes.find((r: any) => r.roomTypeId === testRoomTypeId);
      expect(penthouse.availableQuantity).toBe(1);

      // Clean up hold
      await prisma.reservation.delete({ where: { id: holdRes.body.data.id } });
    });

    it('protects hold creation with target-verified idempotency key', async () => {
      const idempotencyKey = `hold-idem-${Date.now()}`;
      const payload = {
        checkInDate: '2026-12-20',
        checkOutDate: '2026-12-22',
        guestName: 'Idempotency Tester',
        guestEmail: 'idem@example.com',
        guestPhone: '+1 555-0188',
        rooms: [
          {
            roomTypeId: testRoomTypeId,
            ratePlanId: testRatePlanId,
            quantity: 1,
          },
        ],
        idempotencyKey,
      };

      // First call
      const firstRes = await request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(payload);

      expect(firstRes.status).toBe(201);
      const code1 = firstRes.body.data.reservation_code;

      // Second call (replay with exact same payload)
      const replayRes = await request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(payload);

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.isReplay).toBe(true);
      expect(replayRes.body.data.reservation_code).toBe(code1);

      // Third call (collision with different payload)
      const conflictRes = await request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ...payload,
          guestEmail: 'different@example.com',
        });

      expect(conflictRes.status).toBe(409);

      await prisma.reservation.delete({ where: { id: firstRes.body.data.id } });
    });

    it('prevents overselling when concurrent requests exceed available inventory', async () => {
      // Exactly 2 rooms exist in testRoomTypeId.
      // We launch 3 simultaneous hold requests, each asking for 1 room.
      // Exactly 2 must succeed, and 1 must fail with 409 Conflict.
      const dates = {
        checkInDate: '2027-01-15',
        checkOutDate: '2027-01-18',
      };

      const req1 = request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ...dates,
          guestName: 'Concurrent Guest 1',
          guestEmail: 'cg1@example.com',
          guestPhone: '+1 555-0101',
          rooms: [{ roomTypeId: testRoomTypeId, ratePlanId: testRatePlanId, quantity: 1 }],
        });

      const req2 = request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ...dates,
          guestName: 'Concurrent Guest 2',
          guestEmail: 'cg2@example.com',
          guestPhone: '+1 555-0102',
          rooms: [{ roomTypeId: testRoomTypeId, ratePlanId: testRatePlanId, quantity: 1 }],
        });

      const req3 = request(app)
        .post(`/api/v1/hotels/${hotelParisId}/holds`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ...dates,
          guestName: 'Concurrent Guest 3',
          guestEmail: 'cg3@example.com',
          guestPhone: '+1 555-0103',
          rooms: [{ roomTypeId: testRoomTypeId, ratePlanId: testRatePlanId, quantity: 1 }],
        });

      const results = await Promise.all([req1, req2, req3]);
      const statuses = results.map((r) => r.status);

      const successCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      // Because only 2 physical rooms exist, exactly 2 can succeed and at least 1 must conflict
      expect(successCount).toBe(2);
      expect(conflictCount).toBe(1);

      // Clean up the created reservations
      for (const res of results) {
        if (res.body.data?.id) {
          await prisma.reservation.delete({ where: { id: res.body.data.id } }).catch(() => {});
        }
      }
    });
  });

  // ====================================================
  // 6. CROSS-PROPERTY ISOLATION & AUTHORIZATION
  // ====================================================
  describe('Cross-Property Isolation & Authorization', () => {
    it('prevents a manager from creating inventory in another hotel', async () => {
      // Tokyo Manager creates room type - propertyGuard resolves Tokyo Hotel
      const res = await request(app)
        .post('/api/v1/management/room-types')
        .set('Authorization', `Bearer ${managerTokyoToken}`)
        .send({
          name: 'Tokyo Luxury Pod Suite',
          maxGuests: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.hotel_id).toBe(hotelTokyoId);
      expect(res.body.data.hotel_id).not.toBe(hotelParisId);

      // Clean up
      await prisma.roomType.delete({ where: { id: res.body.data.id } });
    });

    it('rejects unauthenticated requests to inventory endpoints', async () => {
      const res = await request(app).get('/api/v1/management/room-types');
      expect(res.status).toBe(401);
    });

    it('rejects guest access to management inventory endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/management/room-types')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(res.status).toBe(403);
    });
  });
});
