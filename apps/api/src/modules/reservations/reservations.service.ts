// apps/api/src/modules/reservations/reservations.service.ts
import { prisma } from '@hbms/database';
import {
  ReservationStatus,
  PaymentStatus,
  RefundStatus,
  CancellationPolicy,
  Role,
  ConfirmReservationInput,
  CancelReservationInput,
  RetryRefundInput,
} from '@hbms/shared';
import {
  PaymentProvider,
} from '../payments/payment-provider.interface';
import { defaultPaymentProvider } from '../payments/mock-payment.provider';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors';
import { notificationsService } from '../notifications/notifications.service';

export class ReservationsService {
  constructor(private paymentProvider: PaymentProvider = defaultPaymentProvider) {}

  /**
   * Converts a valid TEMPORARY_HOLD into a CONFIRMED reservation after processing payment.
   * Atomically protects against concurrent confirmations, duplicate payments, and expired holds.
   */
  async confirmReservation(
    reservationIdOrCode: string,
    input: ConfirmReservationInput,
    userId?: string,
    userRole?: Role,
    userHotelId?: string
  ) {
    // 1 & 2. Concurrent Verification: Idempotency Payment check & Reservation Fetch in parallel
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(reservationIdOrCode);

    const [existingPayment, reservation] = await Promise.all([
      input.idempotencyKey
        ? prisma.payment.findUnique({
            where: { idempotency_key: input.idempotencyKey },
            include: {
              reservation: {
                include: {
                  hotel: true,
                  rooms: {
                    include: {
                      room_type: { select: { id: true, name: true, slug: true } },
                      rate_plan: { select: { id: true, name: true, cancellation_policy: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve(null),
      prisma.reservation.findFirst({
        where: isObjectId
          ? { OR: [{ id: reservationIdOrCode }, { reservation_code: reservationIdOrCode }] }
          : { reservation_code: reservationIdOrCode },
        include: {
          hotel: true,
          rooms: {
            include: {
              room_type: { select: { id: true, name: true, slug: true } },
              rate_plan: { select: { id: true, name: true, cancellation_policy: true } },
            },
          },
          payments: true,
        },
      }),
    ]);

    if (existingPayment) {
      if (existingPayment.status === PaymentStatus.SUCCESS) {
        // Safe replay of already confirmed reservation and payment
        return {
          isReplay: true,
          reservation: existingPayment.reservation,
          payment: existingPayment,
        };
      } else {
        throw new BadRequestError(
          `Payment for this idempotency key previously failed (${existingPayment.error_message}). Please retry with a new idempotency key.`
        );
      }
    }

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // 3. Authorization Check
    if (userId) {
      if (userRole === Role.GUEST) {
        if (reservation.guest_user_id && reservation.guest_user_id !== userId) {
          throw new ForbiddenError('You are not authorized to confirm this reservation');
        }
      } else if (userRole === Role.HOTEL_MANAGER || userRole === Role.RECEPTIONIST) {
        if (reservation.hotel_id !== userHotelId) {
          throw new ForbiddenError('Staff can only confirm reservations for their assigned hotel');
        }
      }
    }

    // 4. State & Expiration Validation
    if (reservation.status === ReservationStatus.CONFIRMED) {
      const successfulPayment = reservation.payments.find((p) => p.status === PaymentStatus.SUCCESS);
      return {
        isReplay: true,
        reservation,
        payment: successfulPayment || null,
      };
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestError('This reservation has been cancelled and cannot be confirmed');
    }

    if (reservation.status === ReservationStatus.EXPIRED) {
      throw new BadRequestError('The temporary hold on this reservation has expired');
    }

    if (reservation.status === ReservationStatus.TEMPORARY_HOLD) {
      const now = new Date();
      if (reservation.hold_expires_at && new Date(reservation.hold_expires_at).getTime() < now.getTime()) {
        // Mark as EXPIRED in DB
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });
        throw new BadRequestError('The temporary hold on this reservation has expired and cannot be confirmed');
      }
    } else {
      throw new BadRequestError(`Reservation in status "${reservation.status}" cannot be confirmed`);
    }

    // 5. Execute Payment with PaymentProvider
    const paymentResult = await this.paymentProvider.processPayment({
      amountCents: reservation.total_cents,
      currency: reservation.currency,
      reservationId: reservation.id,
      idempotencyKey: input.idempotencyKey,
      paymentMethod: input.paymentMethod || 'MOCK_CARD',
      cardDetails: input.cardDetails,
      simulateDecline: input.simulateDecline,
      simulateError: input.simulateError,
    });

    // 6. If Payment Failed: Record FAILED payment in database and reject
    if (!paymentResult.success) {
      await prisma.payment.create({
        data: {
          reservation: { connect: { id: reservation.id } },
          idempotency_key: input.idempotencyKey,
          transaction_reference: paymentResult.transactionReference,
          payment_provider: this.paymentProvider.name,
          payment_method: input.paymentMethod || 'MOCK_CARD',
          amount_cents: reservation.total_cents,
          currency: reservation.currency,
          status: PaymentStatus.FAILED,
          error_message: paymentResult.errorMessage || null,
        },
      });

      // Keep reservation in TEMPORARY_HOLD so guest can retry before expiration
      throw new BadRequestError(`Payment failed: ${paymentResult.errorMessage}`);
    }

    // 7. Atomic Confirmation:
    // If payment succeeded, atomically confirm reservation and record SUCCESS payment
    const result = await prisma.$transaction(
      async (tx) => {
        // Re-read inside transaction to verify status hasn't changed concurrently
        const currentRes = await tx.reservation.findUnique({
          where: { id: reservation.id },
          select: { id: true, status: true, hold_expires_at: true },
        });

        if (!currentRes || currentRes.status !== ReservationStatus.TEMPORARY_HOLD) {
          throw new ConflictError(
            `Reservation cannot be confirmed. Current status: ${currentRes?.status || 'UNKNOWN'}`
          );
        }

        const now = new Date();
        if (currentRes.hold_expires_at && new Date(currentRes.hold_expires_at).getTime() < now.getTime()) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.EXPIRED },
          });
          throw new BadRequestError('Temporary hold expired during payment processing');
        }

        // Concurrently record successful Payment and confirm Reservation inside transaction
        const [payment, updatedReservation] = await Promise.all([
          tx.payment.create({
            data: {
              reservation: { connect: { id: reservation.id } },
              idempotency_key: input.idempotencyKey,
              transaction_reference: paymentResult.transactionReference,
              payment_provider: this.paymentProvider.name,
              payment_method: input.paymentMethod || 'MOCK_CARD',
              amount_cents: reservation.total_cents,
              currency: reservation.currency,
              status: PaymentStatus.SUCCESS,
              error_message: null,
            },
          }),
          tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.CONFIRMED,
              hold_expires_at: null,
              guest_user_id: reservation.guest_user_id || userId || null,
            },
            include: {
              hotel: true,
              rooms: {
                include: {
                  room_type: { select: { id: true, name: true, slug: true } },
                  rate_plan: { select: { id: true, name: true, cancellation_policy: true } },
                },
              },
              payments: true,
            },
          }),
        ]);

        return {
          isReplay: false,
          reservation: updatedReservation,
          payment,
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    // Dispatch booking confirmed notification
    const recipientUserId = result.reservation.guest_user_id || userId;
    if (recipientUserId && !result.isReplay) {
      notificationsService.createNotification({
        userId: recipientUserId,
        title: 'Booking Confirmed',
        message: `Your booking for ${result.reservation.hotel.name} (#${result.reservation.reservation_code}) has been confirmed!`,
        type: 'BOOKING_CONFIRMED',
        link: '/reservations',
        metadata: {
          reservationId: result.reservation.id,
          reservationCode: result.reservation.reservation_code,
          hotelId: result.reservation.hotel_id,
        },
      }).catch((err) => console.error('Failed to dispatch booking confirmed notification:', err));
    }

    return result;
  }

  /**
   * Retrieves reservation by ID or reservation_code with complete relations.
   */
  async getReservation(
    reservationIdOrCode: string,
    guestEmail?: string,
    userId?: string,
    userRole?: Role,
    userHotelId?: string
  ) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(reservationIdOrCode);
    const reservation = await prisma.reservation.findFirst({
      where: isObjectId
        ? { OR: [{ id: reservationIdOrCode }, { reservation_code: reservationIdOrCode }] }
        : { reservation_code: reservationIdOrCode },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
            country: true,
            phone: true,
            email: true,
            check_in_time: true,
            check_out_time: true,
          },
        },
        rooms: {
          include: {
            room_type: { select: { id: true, name: true, slug: true } },
            rate_plan: { select: { id: true, name: true, cancellation_policy: true } },
            assignments: {
              where: { status: 'ACTIVE' },
              include: { room: { select: { room_number: true, floor: true } } },
            },
          },
        },
        payments: {
          orderBy: { created_at: 'desc' },
        },
        cancellation: {
          include: {
            refund: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Access control
    if (userId) {
      if (userRole === Role.GUEST) {
        if (reservation.guest_user_id && reservation.guest_user_id !== userId) {
          throw new ForbiddenError('You do not have permission to view this reservation');
        }
      } else if (userRole === Role.HOTEL_MANAGER || userRole === Role.RECEPTIONIST) {
        if (reservation.hotel_id !== userHotelId) {
          throw new ForbiddenError('You can only view reservations for your assigned hotel');
        }
      }
    } else if (guestEmail) {
      if (reservation.guest_email.toLowerCase() !== guestEmail.toLowerCase()) {
        throw new ForbiddenError('Guest email does not match reservation');
      }
    }

    return reservation;
  }

  /**
   * Lists reservations for the authenticated guest user.
   */
  async listMyReservations(
    userId: string,
    userEmail: string,
    filter: 'upcoming' | 'completed' | 'cancelled' | 'all' = 'all'
  ) {
    const now = new Date();

    // Void and mark any expired temporary holds
    try {
      await prisma.reservation.updateMany({
        where: {
          status: ReservationStatus.TEMPORARY_HOLD,
          hold_expires_at: { lt: now },
        },
        data: {
          status: ReservationStatus.EXPIRED,
        },
      });
    } catch {
      // Ignore background cleanup failures
    }

    const userCondition = {
      OR: [{ guest_user_id: userId }, { guest_email: userEmail.toLowerCase().trim() }],
    };

    const where: any = {
      AND: [userCondition],
    };

    if (filter === 'upcoming') {
      where.AND.push({
        OR: [
          {
            status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
            check_out_date: { gte: now },
          },
          {
            status: ReservationStatus.TEMPORARY_HOLD,
            hold_expires_at: { gt: now },
          },
        ],
      });
    } else if (filter === 'completed') {
      where.AND.push({
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
      });
    } else if (filter === 'cancelled') {
      where.AND.push({
        status: { in: [ReservationStatus.CANCELLED, ReservationStatus.EXPIRED] },
      });
    }

    const list = await prisma.reservation.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            country: true,
            check_in_time: true,
            check_out_time: true,
          },
        },
        rooms: {
          include: {
            room_type: { select: { id: true, name: true } },
            rate_plan: { select: { id: true, name: true, cancellation_policy: true } },
          },
        },
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          take: 1,
        },
        cancellation: {
          include: { refund: true },
        },
      },
    });

    const resIds = list.map((r) => r.id);
    const existingReviews = await prisma.review.findMany({
      where: {
        OR: [
          { reservation_id: { in: resIds } },
          { user_id: userId, hotel_id: { in: list.map((r) => r.hotel_id) } },
        ],
      },
      select: {
        id: true,
        reservation_id: true,
        hotel_id: true,
        user_id: true,
        rating: true,
        title: true,
        comment: true,
        created_at: true,
      },
    });

    const reviewMapByResId = new Map<string, any>();
    const reviewMapByHotelId = new Map<string, any>();
    for (const rev of existingReviews) {
      if (rev.reservation_id) {
        reviewMapByResId.set(rev.reservation_id, rev);
      }
      if (rev.hotel_id) {
        reviewMapByHotelId.set(rev.hotel_id, rev);
      }
    }

    const nowTime = Date.now();
    return list.map((res) => {
      const matchingReview = reviewMapByResId.get(res.id) || reviewMapByHotelId.get(res.hotel_id) || null;
      const isReviewed = Boolean(matchingReview);

      const checkInDate = new Date(res.check_in_date);
      const checkInDateStart = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate()
      ).getTime();
      const createdAt = new Date(res.created_at).getTime();
      const booking48hWindow = createdAt + 48 * 60 * 60 * 1000;
      const advanceCutoff = checkInDate.getTime() - 48 * 60 * 60 * 1000;
      const rawDeadline = Math.max(booking48hWindow, advanceCutoff);
      const cutoffTime = Math.min(rawDeadline, checkInDateStart);
      const hasReachedCheckIn = nowTime >= checkInDateStart;
      const isBeforeDeadline = nowTime < cutoffTime && !hasReachedCheckIn;
      const timeRemainingMs = Math.max(0, cutoffTime - nowTime);
      const canCancel = !hasReachedCheckIn && res.status === ReservationStatus.CONFIRMED;

      return {
        ...res,
        isReviewed,
        review: matchingReview
          ? {
              id: matchingReview.id,
              rating: matchingReview.rating,
              title: matchingReview.title,
              comment: matchingReview.comment,
              createdAt: matchingReview.created_at.toISOString(),
            }
          : null,
        cancellationDeadline: {
          cutoffTime: new Date(cutoffTime).toISOString(),
          timeRemainingMs,
          hasReachedCheckIn,
          isBeforeDeadline,
          canCancel,
        },
      };
    });
  }

  /**
   * Previews cancellation terms, deadline, and eligible refund amount before cancelling.
   */
  async previewCancellation(
    reservationIdOrCode: string,
    userId?: string,
    userRole?: Role,
    userHotelId?: string
  ) {
    const reservation = await this.getReservation(
      reservationIdOrCode,
      undefined,
      userId,
      userRole,
      userHotelId
    );

    const primaryRoom = reservation.rooms[0];
    const policy = (primaryRoom?.rate_plan?.cancellation_policy ||
      CancellationPolicy.FREE_CANCELLATION) as CancellationPolicy;
    const deadlineHours = 48; // Standard 48h cancellation window

    const checkInDate = new Date(reservation.check_in_date);
    // Start of check-in day (00:00:00)
    const checkInDateStart = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth(),
      checkInDate.getDate()
    ).getTime();

    // 48h refund window from reservation booking
    const createdAt = new Date(reservation.created_at).getTime();
    const booking48hWindow = createdAt + 48 * 60 * 60 * 1000;

    // Advance booking free cancellation cutoff (48h before check-in)
    const advanceCutoff = checkInDate.getTime() - 48 * 60 * 60 * 1000;

    // The free cancellation window is whichever is later between booking grace window and advance cutoff
    const rawDeadline = Math.max(booking48hWindow, advanceCutoff);

    // Absolute cancellation cutoff is min(rawDeadline, checkInDateStart)
    const cutoffTime = Math.min(rawDeadline, checkInDateStart);

    const now = Date.now();
    const hasReachedCheckIn = now >= checkInDateStart;
    const isBeforeDeadline = now < cutoffTime && !hasReachedCheckIn;
    const timeRemainingMs = Math.max(0, cutoffTime - now);
    const canCancel = !hasReachedCheckIn && reservation.status === ReservationStatus.CONFIRMED;

    let eligibleRefundCents = 0;
    let cancellationFeeCents = 0;
    let message = '';

    if (hasReachedCheckIn) {
      eligibleRefundCents = 0;
      cancellationFeeCents = reservation.total_cents;
      message = 'Check-in date reached. Online cancellations and refunds are not permitted on or after the check-in date.';
    } else if (isBeforeDeadline) {
      // 100% full refund
      eligibleRefundCents = reservation.total_cents;
      cancellationFeeCents = 0;
      message = 'Eligible for 100% full refund within the cancellation window.';
    } else {
      // Past cancellation deadline, but before check-in date
      if (policy === CancellationPolicy.FREE_CANCELLATION) {
        const firstNightFee = reservation.rooms.reduce(
          (sum, r) => sum + r.nightly_rate_cents * r.quantity,
          0
        );
        cancellationFeeCents = Math.min(reservation.total_cents, firstNightFee);
        eligibleRefundCents = Math.max(0, reservation.total_cents - cancellationFeeCents);
        message =
          'Cancelled past the free cancellation window. The first night charge is retained as a cancellation fee.';
      } else if (policy === CancellationPolicy.PARTIAL_REFUND) {
        eligibleRefundCents = Math.round(reservation.total_cents * 0.5);
        cancellationFeeCents = reservation.total_cents - eligibleRefundCents;
        message = 'Partial refund policy applies: 50% refund on total reservation amount.';
      } else {
        // NON_REFUNDABLE
        eligibleRefundCents = 0;
        cancellationFeeCents = reservation.total_cents;
        message = 'Non-refundable rate plan. No refund is issued upon cancellation.';
      }
    }

    return {
      reservationId: reservation.id,
      reservationCode: reservation.reservation_code,
      hotelName: reservation.hotel?.name || 'Hotel',
      hotelAddress: reservation.hotel
        ? `${reservation.hotel.address || ''}, ${reservation.hotel.city || ''}, ${reservation.hotel.country || ''}`.replace(/^,\s*|,\s*$/g, '')
        : '',
      checkInDate: reservation.check_in_date,
      checkOutDate: reservation.check_out_date,
      guestName: reservation.guest_name,
      guestEmail: reservation.guest_email,
      totalRoomsCount: reservation.total_rooms_count,
      rooms: reservation.rooms?.map((rm) => ({
        id: rm.id,
        name: rm.room_type?.name,
        quantity: rm.quantity,
        nightlyRateCents: rm.nightly_rate_cents,
        subtotalCents: rm.total_price_cents,
      })) || [],
      policyApplied: policy,
      deadlineHours,
      cutoffTime: new Date(cutoffTime).toISOString(),
      timeRemainingMs,
      hasReachedCheckIn,
      isBeforeDeadline,
      canCancel,
      subtotalCents: reservation.subtotal_cents,
      taxCents: reservation.tax_cents,
      feesCents: reservation.fees_cents,
      totalPaidCents: reservation.total_cents,
      eligibleRefundCents,
      cancellationFeeCents,
      currency: reservation.currency,
      message,
    };
  }

  /**
   * Cancels a reservation, calculates refund eligibility, and processes refund via provider.
   */
  async cancelReservation(
    reservationIdOrCode: string,
    input: CancelReservationInput,
    userId?: string,
    userRole?: Role,
    userHotelId?: string
  ) {
    const reservation = await this.getReservation(
      reservationIdOrCode,
      undefined,
      userId,
      userRole,
      userHotelId
    );

    // If already cancelled, return existing cancellation record idempotently
    if (reservation.status === ReservationStatus.CANCELLED && reservation.cancellation) {
      return {
        isReplay: true,
        reservation,
        cancellation: reservation.cancellation,
      };
    }

    if (
      reservation.status === ReservationStatus.CHECKED_IN ||
      reservation.status === ReservationStatus.CHECKED_OUT
    ) {
      throw new BadRequestError('Checked-in or completed stays cannot be cancelled online.');
    }

    // Determine refund eligibility
    const preview = await this.previewCancellation(
      reservationIdOrCode,
      userId,
      userRole,
      userHotelId
    );

    if (preview.hasReachedCheckIn) {
      throw new BadRequestError('Reservations cannot be cancelled on or after the check-in date.');
    }

    const successfulPayment = reservation.payments.find(
      (p) => p.status === PaymentStatus.SUCCESS
    );

    // If reservation was in TEMPORARY_HOLD and unpaid:
    if (reservation.status === ReservationStatus.TEMPORARY_HOLD) {
      const cancellation = await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.CANCELLED },
        });

        return await tx.cancellationRecord.create({
          data: {
            reservation: { connect: { id: reservation.id } },
            cancelled_by_id: userId || null,
            cancellation_reason: input.reason || 'Guest cancelled hold',
            policy_applied: preview.policyApplied as CancellationPolicy,
            eligible_refund_cents: 0,
            cancellation_fee_cents: 0,
            currency: reservation.currency,
          },
        });
      });

      return {
        isReplay: false,
        reservation: { ...reservation, status: ReservationStatus.CANCELLED },
        cancellation,
      };
    }

    // Reservation was CONFIRMED:
    // Create CancellationRecord and release any room assignments
    const cancellation = await prisma.$transaction(async (tx) => {
      // Release any active room assignments
      await tx.roomAssignment.updateMany({
        where: {
          reservation_id: reservation.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
          released_at: new Date(),
          release_reason: 'RESERVATION_CANCELLED',
        },
      });

      // Update reservation status
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CANCELLED },
      });

      // Create cancellation record
      return await tx.cancellationRecord.create({
        data: {
          reservation: { connect: { id: reservation.id } },
          cancelled_by_id: userId || null,
          cancellation_reason: input.reason || 'Guest requested cancellation',
          policy_applied: preview.policyApplied as CancellationPolicy,
          eligible_refund_cents: preview.eligibleRefundCents,
          cancellation_fee_cents: preview.cancellationFeeCents,
          currency: reservation.currency,
        },
      });
    });

    // If refund is eligible and successful payment exists, process through payment provider
    let refundRecord: any = null;
    if (preview.eligibleRefundCents > 0 && successfulPayment) {
      const refundIdempotencyKey = `REF-${cancellation.id}`;

      // Call payment provider
      const refundResult = await this.paymentProvider.processRefund({
        paymentTransactionReference: successfulPayment.transaction_reference,
        amountCents: preview.eligibleRefundCents,
        currency: reservation.currency,
        idempotencyKey: refundIdempotencyKey,
        reason: input.reason,
        simulateFailure: input.simulateFailure,
      });

      // Record refund in DB
      refundRecord = await prisma.refundRecord.create({
        data: {
          cancellation: { connect: { id: cancellation.id } },
          payment: { connect: { id: successfulPayment.id } },
          refund_reference: refundResult.refundReference,
          amount_cents: preview.eligibleRefundCents,
          currency: reservation.currency,
          status: refundResult.status,
          idempotency_key: refundIdempotencyKey,
          error_message: refundResult.errorMessage || null,
          processed_at: refundResult.success ? new Date() : null,
        },
      });

      // Update payment status if successfully refunded
      if (refundResult.success) {
        await prisma.payment.update({
          where: { id: successfulPayment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }
    }

    const updatedReservation = await this.getReservation(reservation.id);

    return {
      isReplay: false,
      reservation: updatedReservation,
      cancellation: {
        ...cancellation,
        refund: refundRecord,
      },
    };
  }

  /**
   * Retries a failed refund for a cancelled reservation.
   * Safe, retryable, and idempotent.
   */
  async retryRefund(
    reservationIdOrCode: string,
    input: RetryRefundInput,
    userId?: string,
    userRole?: Role,
    userHotelId?: string
  ) {
    const reservation = await this.getReservation(
      reservationIdOrCode,
      undefined,
      userId,
      userRole,
      userHotelId
    );

    if (reservation.status !== ReservationStatus.CANCELLED || !reservation.cancellation) {
      throw new BadRequestError('Reservation is not cancelled or has no cancellation record');
    }

    const cancellation = reservation.cancellation;
    if (cancellation.eligible_refund_cents <= 0) {
      throw new BadRequestError('This cancellation has no eligible refund amount');
    }

    const existingRefund = cancellation.refund;
    if (existingRefund && existingRefund.status === RefundStatus.PROCESSED) {
      return {
        isReplay: true,
        refund: existingRefund,
        message: 'Refund was already processed successfully.',
      };
    }

    const successfulPayment = reservation.payments.find(
      (p) => p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.REFUNDED
    );

    if (!successfulPayment) {
      throw new BadRequestError('Original payment transaction not found for refund');
    }

    const retryIdempotencyKey = input.idempotencyKey || `RETRY-REF-${cancellation.id}-${Date.now()}`;

    // Call payment provider
    const refundResult = await this.paymentProvider.processRefund({
      paymentTransactionReference: successfulPayment.transaction_reference,
      amountCents: cancellation.eligible_refund_cents,
      currency: reservation.currency,
      idempotencyKey: retryIdempotencyKey,
      reason: cancellation.cancellation_reason || 'Retry refund',
      simulateFailure: input.simulateFailure,
    });

    let updatedRefund: any;
    if (existingRefund) {
      updatedRefund = await prisma.refundRecord.update({
        where: { id: existingRefund.id },
        data: {
          status: refundResult.status,
          refund_reference: refundResult.refundReference,
          error_message: refundResult.errorMessage || null,
          processed_at: refundResult.success ? new Date() : null,
          idempotency_key: retryIdempotencyKey,
        },
      });
    } else {
      updatedRefund = await prisma.refundRecord.create({
        data: {
          cancellation: { connect: { id: cancellation.id } },
          payment: { connect: { id: successfulPayment.id } },
          refund_reference: refundResult.refundReference,
          amount_cents: cancellation.eligible_refund_cents,
          currency: reservation.currency,
          status: refundResult.status,
          idempotency_key: retryIdempotencyKey,
          error_message: refundResult.errorMessage || null,
          processed_at: refundResult.success ? new Date() : null,
        },
      });
    }

    if (refundResult.success) {
      await prisma.payment.update({
        where: { id: successfulPayment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
    }

    return {
      isReplay: false,
      refund: updatedRefund,
      success: refundResult.success,
      errorMessage: refundResult.errorMessage,
    };
  }
}

export const reservationsService = new ReservationsService();

