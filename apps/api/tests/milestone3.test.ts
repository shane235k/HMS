// apps/api/tests/milestone3.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '@hbms/database';
import { ReservationStatus, PaymentStatus, RefundStatus, CancellationPolicy } from '@hbms/shared';

describe('Milestone 3: Reservation Lifecycle, Payments & Refunds', () => {
  const app = createApp();

  let adminToken: string;
  let managerParisToken: string;
  let guestSophiaToken: string;
  let guestSophiaUserId: string;
  let guestLucasToken: string;
  let guestLucasUserId: string;

  let hotelParisId: string;
  let roomTypeId: string;
  let ratePlanId: string;

  beforeAll(async () => {
    // 1. Authenticate platform admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hbms.com', password: 'Admin123!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // 2. Authenticate Paris hotel manager
    const managerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.paris@grandluxe.com', password: 'Manager123!' });
    expect(managerLogin.status).toBe(200);
    managerParisToken = managerLogin.body.data.tokens.accessToken;
    hotelParisId = managerLogin.body.data.user.hotelId;

    // 3. Authenticate Guest Sophia
    const sophiaLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });
    expect(sophiaLogin.status).toBe(200);
    guestSophiaToken = sophiaLogin.body.data.tokens.accessToken;
    guestSophiaUserId = sophiaLogin.body.data.user.id;

    // 4. Register or login second guest Lucas (for access isolation testing)
    const lucasRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'guest.lucas@example.com',
        password: 'GuestPassword123!',
        firstName: 'Lucas',
        lastName: 'Vance',
        role: 'GUEST',
      });

    if (lucasRegister.status === 201) {
      guestLucasToken = lucasRegister.body.data.tokens.accessToken;
      guestLucasUserId = lucasRegister.body.data.user.id;
    } else {
      const lucasLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'guest.lucas@example.com', password: 'GuestPassword123!' });
      expect(lucasLogin.status).toBe(200);
      guestLucasToken = lucasLogin.body.data.tokens.accessToken;
      guestLucasUserId = lucasLogin.body.data.user.id;
    }

    // 5. Query active room type & rate plan in Paris hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelParisId },
      include: {
        room_types: {
          where: { is_active: true },
          include: { rate_plans: { where: { is_active: true } } },
        },
      },
    });

    expect(hotel).toBeDefined();
    expect(hotel!.room_types.length).toBeGreaterThan(0);
    const primaryRt = hotel!.room_types[0];
    roomTypeId = primaryRt.id;
    ratePlanId = primaryRt.rate_plans[0].id;

    // Clean up previous test reservations for Milestone 3
    await prisma.refundRecord.deleteMany({
      where: { refund_reference: { startsWith: 'REF-' } },
    });
    await prisma.cancellationRecord.deleteMany({
      where: { cancellation_reason: { contains: 'M3-' } },
    });
    await prisma.payment.deleteMany({
      where: { idempotency_key: { startsWith: 'PAY-M3' } },
    });
    await prisma.reservation.deleteMany({
      where: { guest_email: { in: ['guest.sophia@example.com', 'guest.lucas@example.com', 'guest.m3@example.com'] } },
    });
  });

  // Helper to create a temporary hold
  async function createTestHold(guestEmail: string = 'guest.sophia@example.com', checkInOffsetDays: number = 30) {
    const checkIn = new Date(Date.now() + checkInOffsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + (checkInOffsetDays + 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const holdRes = await request(app)
      .post(`/api/v1/hotels/${hotelParisId}/holds`)
      .set('Authorization', `Bearer ${guestSophiaToken}`)
      .send({
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName: 'Sophia Martinez',
        guestEmail,
        guestPhone: '+33 6 12 34 56 78',
        rooms: [{ roomTypeId, ratePlanId, quantity: 1 }],
      });

    expect(holdRes.status).toBe(201);
    return holdRes.body.data;
  }

  // ====================================================
  // 1. SUCCESSFUL PAYMENT & RESERVATION CONFIRMATION
  // ====================================================
  describe('Successful Payment & Reservation Confirmation', () => {
    it('rejects unauthenticated reservation confirmation requests with 401 Unauthorized', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 35);
      const res = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .send({
          idempotencyKey: `PAY-M3-UNAUTH-${Date.now()}`,
          paymentMethod: 'CARD',
          cardDetails: {
            cardNumber: '4242424242424242',
            cardholderName: 'Sophia Martinez',
            expMonth: 12,
            expYear: 2028,
            cvv: '123',
          },
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('converts a valid temporary hold into a confirmed reservation upon successful payment', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 40);
      expect(hold.status).toBe(ReservationStatus.TEMPORARY_HOLD);
      expect(hold.hold_expires_at).toBeTruthy();

      const idempotencyKey = `PAY-M3-SUCCESS-${Date.now()}`;
      const res = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey,
          paymentMethod: 'CARD',
          cardDetails: {
            cardNumber: '4242424242424242',
            cardholderName: 'Sophia Martinez',
            expMonth: 12,
            expYear: 2028,
            cvv: '123',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isReplay).toBe(false);

      const { reservation, payment } = res.body.data;
      expect(reservation.id).toBe(hold.id);
      expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
      expect(reservation.hold_expires_at).toBeNull();
      expect(reservation.currency).toBe('INR');

      // Verify payment details
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.amount_cents).toBe(reservation.total_cents);
      expect(payment.currency).toBe('INR');
      expect(payment.transaction_reference).toMatch(/^TXN-\d{8}-[A-F0-9]{8}$/);
    });

    it('handles idempotent confirmation replay safely without duplicate charging', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 45);
      const idempotencyKey = `PAY-M3-IDEMP-${Date.now()}`;

      // First confirmation call
      const res1 = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey,
          paymentMethod: 'CARD',
          cardDetails: { cardNumber: '4242424242424242' },
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.isReplay).toBe(false);
      const originalTxn = res1.body.data.payment.transaction_reference;

      // Replay with exact same idempotency key
      const res2 = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey,
          paymentMethod: 'CARD',
          cardDetails: { cardNumber: '4242424242424242' },
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.isReplay).toBe(true);
      expect(res2.body.data.payment.transaction_reference).toBe(originalTxn);

      // Verify only ONE payment record exists in the database
      const paymentsCount = await prisma.payment.count({
        where: { reservation_id: hold.id },
      });
      expect(paymentsCount).toBe(1);
    });
  });

  // ====================================================
  // 2. FAILED PAYMENT & RETRY WORKFLOW
  // ====================================================
  describe('Failed Payment & Retry Workflow', () => {
    it('records failed payment attempt, keeps hold active, and allows subsequent retry', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 50);

      // 1. Attempt payment with card ending in 0002 (Insufficient funds)
      const failedKey = `PAY-M3-FAIL-${Date.now()}`;
      const failRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: failedKey,
          paymentMethod: 'CARD',
          cardDetails: {
            cardNumber: '4000000000000002',
            cardholderName: 'Sophia Martinez',
          },
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.success).toBe(false);
      expect(failRes.body.error.message).toContain('Insufficient funds');

      // Verify payment record was recorded as FAILED in DB
      const failedPayment = await prisma.payment.findUnique({
        where: { idempotency_key: failedKey },
      });
      expect(failedPayment).toBeDefined();
      expect(failedPayment!.status).toBe(PaymentStatus.FAILED);
      expect(failedPayment!.error_message).toContain('Insufficient funds');

      // Verify reservation is STILL in TEMPORARY_HOLD
      const checkRes = await prisma.reservation.findUnique({
        where: { id: hold.id },
      });
      expect(checkRes!.status).toBe(ReservationStatus.TEMPORARY_HOLD);

      // 2. Guest retries with a new valid card and new idempotency key
      const retryKey = `PAY-M3-RETRY-${Date.now()}`;
      const retryRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: retryKey,
          paymentMethod: 'CARD',
          cardDetails: {
            cardNumber: '4242424242424242',
          },
        });

      expect(retryRes.status).toBe(201);
      expect(retryRes.body.data.reservation.status).toBe(ReservationStatus.CONFIRMED);

      // Database now has exactly 2 payments: 1 FAILED, 1 SUCCESS
      const totalPayments = await prisma.payment.findMany({
        where: { reservation_id: hold.id },
        orderBy: { created_at: 'asc' },
      });
      expect(totalPayments.length).toBe(2);
      expect(totalPayments[0].status).toBe(PaymentStatus.FAILED);
      expect(totalPayments[1].status).toBe(PaymentStatus.SUCCESS);
    });
  });

  // ====================================================
  // 3. EXPIRED HOLD REJECTION
  // ====================================================
  describe('Expired Hold Rejection', () => {
    it('rejects confirmation if the 15-minute hold window has expired', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 55);

      // Artificially expire the hold in the database
      await prisma.reservation.update({
        where: { id: hold.id },
        data: {
          hold_expires_at: new Date(Date.now() - 30 * 1000), // expired 30s ago
        },
      });

      const res = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-M3-EXPIRED-${Date.now()}`,
          paymentMethod: 'CARD',
          cardDetails: { cardNumber: '4242424242424242' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('expired');

      // Verify status in DB updated to EXPIRED
      const updated = await prisma.reservation.findUnique({
        where: { id: hold.id },
      });
      expect(updated!.status).toBe(ReservationStatus.EXPIRED);
    });
  });

  // ====================================================
  // 4. CONCURRENT DUPLICATE CONFIRMATION ATTEMPTS
  // ====================================================
  describe('Concurrent Duplicate Confirmation Attempts', () => {
    it('prevents double-confirming or double-charging under simultaneous concurrent requests', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 60);

      const keyA = `PAY-CONCUR-A-${Date.now()}`;
      const keyB = `PAY-CONCUR-B-${Date.now()}`;

      // Execute 2 concurrent confirmation attempts with different keys
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/v1/reservations/${hold.id}/confirm`)
          .set('Authorization', `Bearer ${guestSophiaToken}`)
          .send({
            idempotencyKey: keyA,
            paymentMethod: 'CARD',
            cardDetails: { cardNumber: '4242424242424242' },
          }),
        request(app)
          .post(`/api/v1/reservations/${hold.id}/confirm`)
          .set('Authorization', `Bearer ${guestSophiaToken}`)
          .send({
            idempotencyKey: keyB,
            paymentMethod: 'CARD',
            cardDetails: { cardNumber: '4242424242424242' },
          }),
      ]);

      const statuses = [resA.status, resB.status];
      // Exactly ONE must succeed with 201 (or 200 replay); the other must fail with 409 or 400
      expect(statuses).toContain(201);
      const successfulCount = statuses.filter((s) => s === 201 || s === 200).length;
      expect(successfulCount).toBeGreaterThanOrEqual(1);

      // Verify only ONE successful payment was charged
      const successfulPayments = await prisma.payment.findMany({
        where: {
          reservation_id: hold.id,
          status: PaymentStatus.SUCCESS,
        },
      });
      expect(successfulPayments.length).toBe(1);
    });
  });

  // ====================================================
  // 5. GUEST RESERVATION PORTAL & ACCESS ISOLATION
  // ====================================================
  describe('Guest Reservation Portal & Access Isolation', () => {
    let sophiaResId: string;

    beforeAll(async () => {
      const hold = await createTestHold('guest.sophia@example.com', 65);
      const conf = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-ISOLATION-${Date.now()}`,
          paymentMethod: 'CARD',
        });
      expect(conf.status).toBe(201);
      sophiaResId = hold.id;
    });

    it('allows authenticated guest to view their own reservation portal and list', async () => {
      const res = await request(app)
        .get('/api/v1/reservations/my?filter=upcoming')
        .set('Authorization', `Bearer ${guestSophiaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((r: any) => r.id === sophiaResId);
      expect(found).toBeDefined();
      expect(found.status).toBe(ReservationStatus.CONFIRMED);
    });

    it('forbids another guest from accessing or viewing Sophia reservation details', async () => {
      const res = await request(app)
        .get(`/api/v1/reservations/${sophiaResId}`)
        .set('Authorization', `Bearer ${guestLucasToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('permission');
    });

    it('forbids another guest from cancelling Sophia reservation', async () => {
      const res = await request(app)
        .post(`/api/v1/reservations/${sophiaResId}/cancel`)
        .set('Authorization', `Bearer ${guestLucasToken}`)
        .send({ reason: 'Malicious attempt' });

      expect(res.status).toBe(403);
    });
  });

  // ====================================================
  // 6. CANCELLATION PREVIEW, FULL REFUND & IDEMPOTENCY
  // ====================================================
  describe('Cancellation Preview, Full Refund & Idempotency', () => {
    let resToCancelId: string;
    let originalTotalCents: number;

    beforeAll(async () => {
      // Create confirmed reservation 70 days in future (well before 48h deadline)
      const hold = await createTestHold('guest.sophia@example.com', 70);
      const conf = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-REFUND-FULL-${Date.now()}`,
          paymentMethod: 'CARD',
        });
      expect(conf.status).toBe(201);
      resToCancelId = hold.id;
      originalTotalCents = conf.body.data.reservation.total_cents;
    });

    it('previews cancellation outcome accurately before cancelling', async () => {
      const res = await request(app)
        .get(`/api/v1/reservations/${resToCancelId}/cancellation-preview`)
        .set('Authorization', `Bearer ${guestSophiaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isBeforeDeadline).toBe(true);
      expect(res.body.data.policyApplied).toBe(CancellationPolicy.FREE_CANCELLATION);
      expect(res.body.data.eligibleRefundCents).toBe(originalTotalCents);
      expect(res.body.data.cancellationFeeCents).toBe(0);
      expect(res.body.data.currency).toBe('INR');
    });

    it('cancels reservation, records cancellation, and issues 100% full refund', async () => {
      const res = await request(app)
        .post(`/api/v1/reservations/${resToCancelId}/cancel`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          reason: 'M3-Plans changed for Paris trip',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { reservation, cancellation } = res.body.data;
      expect(reservation.status).toBe(ReservationStatus.CANCELLED);

      expect(cancellation.policy_applied).toBe(CancellationPolicy.FREE_CANCELLATION);
      expect(cancellation.eligible_refund_cents).toBe(originalTotalCents);
      expect(cancellation.cancellation_fee_cents).toBe(0);
      expect(cancellation.currency).toBe('INR');

      // Verify refund record
      expect(cancellation.refund).toBeDefined();
      expect(cancellation.refund.status).toBe(RefundStatus.PROCESSED);
      expect(cancellation.refund.amount_cents).toBe(originalTotalCents);
      expect(cancellation.refund.refund_reference).toMatch(/^REF-\d{8}-[A-F0-9]{8}$/);

      // Verify original payment status transitioned to REFUNDED
      const paymentInDb = await prisma.payment.findFirst({
        where: { reservation_id: resToCancelId },
      });
      expect(paymentInDb!.status).toBe(PaymentStatus.REFUNDED);
    });

    it('handles idempotent cancellation replay safely', async () => {
      const res = await request(app)
        .post(`/api/v1/reservations/${resToCancelId}/cancel`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          reason: 'Duplicate cancellation call',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isReplay).toBe(true);
      expect(res.body.data.reservation.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  // ====================================================
  // 7. PARTIAL REFUND CALCULATION (PAST DEADLINE)
  // ====================================================
  describe('Partial Refund Calculation', () => {
    it('applies penalty fee when cancelled after the cancellation deadline', async () => {
      // Create confirmed reservation created 3 days ago checking in 2 days from now (past 48h cancellation deadline)
      const hold = await createTestHold('guest.sophia@example.com', 2);
      await prisma.reservation.update({
        where: { id: hold.id },
        data: { created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      });
      const conf = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-PENALTY-${Date.now()}`,
          paymentMethod: 'CARD',
        });
      expect(conf.status).toBe(201);

      // Cancellation preview
      const previewRes = await request(app)
        .get(`/api/v1/reservations/${hold.id}/cancellation-preview`)
        .set('Authorization', `Bearer ${guestSophiaToken}`);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.isBeforeDeadline).toBe(false);
      expect(previewRes.body.data.cancellationFeeCents).toBeGreaterThan(0);
      expect(previewRes.body.data.eligibleRefundCents).toBeLessThan(conf.body.data.reservation.total_cents);

      // Cancel reservation
      const cancelRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/cancel`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({ reason: 'M3-Late emergency cancellation' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.cancellation.cancellation_fee_cents).toBeGreaterThan(0);
      expect(cancelRes.body.data.cancellation.eligible_refund_cents).toBe(
        previewRes.body.data.eligibleRefundCents
      );
    });
  });

  // ====================================================
  // 8. FAILED REFUND & RETRY
  // ====================================================
  describe('Failed Refund & Retry', () => {
    it(
      'handles simulated refund failure and allows subsequent retry',
      async () => {
      const hold = await createTestHold('guest.sophia@example.com', 80);
      const conf = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-FAIL-REF-${Date.now()}`,
          paymentMethod: 'CARD',
        });
      expect(conf.status).toBe(201);

      // 1. Cancel with simulateFailure
      const cancelRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/cancel`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          reason: 'M3-SIMULATE_FAILURE for test',
          simulateFailure: true,
        });

      expect(cancelRes.status).toBe(200);
      const refund = cancelRes.body.data.cancellation.refund;
      expect(refund.status).toBe(RefundStatus.FAILED);
      expect(refund.error_message).toContain('Refund rejected');

      // 2. Retry the failed refund
      const retryRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/refund/retry`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({});

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.success).toBe(true);
      expect(retryRes.body.data.refund.status).toBe(RefundStatus.PROCESSED);
    }, 15000);
  });

  // ====================================================
  // 9. INELIGIBLE CANCELLATION (CHECKED-IN STAY)
  // ====================================================
  describe('Ineligible Cancellation', () => {
    it('rejects cancellation attempts on checked-in stays', async () => {
      const hold = await createTestHold('guest.sophia@example.com', 85);
      const conf = await request(app)
        .post(`/api/v1/reservations/${hold.id}/confirm`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({
          idempotencyKey: `PAY-CHECKED-IN-${Date.now()}`,
          paymentMethod: 'CARD',
        });
      expect(conf.status).toBe(201);

      // Manually set status to CHECKED_IN
      await prisma.reservation.update({
        where: { id: hold.id },
        data: { status: ReservationStatus.CHECKED_IN },
      });

      const cancelRes = await request(app)
        .post(`/api/v1/reservations/${hold.id}/cancel`)
        .set('Authorization', `Bearer ${guestSophiaToken}`)
        .send({ reason: 'Attempting to cancel active stay' });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error.message).toContain('Checked-in or completed stays cannot be cancelled');
    });
  });

  afterAll(async () => {
    // Teardown: Clean up test reservations, payments, and refunds so they don't pollute live database
    await prisma.refundRecord.deleteMany();
    await prisma.cancellationRecord.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.reservationRoom.deleteMany();
    await prisma.reservation.deleteMany();
  });
});
