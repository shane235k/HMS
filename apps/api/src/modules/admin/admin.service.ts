// apps/api/src/modules/admin/admin.service.ts
import { prisma } from '@hbms/database';
import {
  HotelStatus,
  PaymentStatus,
  RefundStatus,
  ReservationStatus,
  OperationalStatus,
  Role,
  formatCurrencyMinor,
} from '@hbms/shared';
import { NotFoundError } from '../../common/errors';
import { computeRevenueAnalytics } from '../../common/utils/revenueAnalytics';

export class AdminService {
  /**
   * Lists all partner hotels on the platform with manager & capacity metadata.
   */
  async listHotels() {
    return await prisma.hotel.findMany({
      include: {
        manager: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        _count: {
          select: {
            rooms: true,
            room_types: true,
            reservations: true,
            staff: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Suspends or reactivates a hotel property.
   * Records an audit log event.
   */
  async updateHotelStatus(
    hotelId: string,
    status: HotelStatus,
    adminUserId: string,
    reason?: string,
    ipAddress?: string
  ) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: { status },
      include: {
        manager: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        hotel_id: hotel.id,
        actor_id: adminUserId,
        actor_role: Role.PLATFORM_ADMIN,
        action: status === HotelStatus.ACTIVE ? 'HOTEL_REACTIVATED' : 'HOTEL_SUSPENDED',
        entity_type: 'Hotel',
        entity_id: hotel.id,
        previous_state: `status: ${hotel.status}`,
        new_state: `status: ${status}${reason ? ` (Reason: ${reason})` : ''}`,
        ip_address: ipAddress || null,
      },
    });

    return updated;
  }

  /**
   * Derives live global platform metrics across all properties and payments.
   * Payments are solely the conveyer of platform revenue: any booking paid today
   * (regardless of future check-in dates) counts towards today's daily revenue.
   */
  async getGlobalPlatformStats() {
    const now = new Date();

    // Start and end of today and yesterday (using local calendar day)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    // Current calendar year boundaries for annual & monthly revenue charts
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(currentYear + 1, 0, 1, 0, 0, 0, 0);

    const [
      totalHotels,
      activeHotels,
      suspendedHotels,
      totalRooms,
      occupiedRooms,
      totalReservations,
      successfulPayments,
      todayPayments,
      yesterdayPayments,
      yearlyPayments,
      yearlyReservations,
      processedRefunds,
      checkInsProcessedCount,
      checkInsPendingCount,
      totalAuditLogs,
      recentAuditLogs,
      recentReservations,
      hotelsWithRooms,
      roomStatusGroups,
    ] = await Promise.all([
      prisma.hotel.count(),
      prisma.hotel.count({ where: { status: HotelStatus.ACTIVE } }),
      prisma.hotel.count({ where: { status: HotelStatus.SUSPENDED } }),
      prisma.room.count({ where: { is_active: true } }),
      prisma.room.count({ where: { operational_status: OperationalStatus.OCCUPIED, is_active: true } }),
      prisma.reservation.count(),
      prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCESS },
        select: { amount_cents: true, currency: true },
      }),
      // Payments captured TODAY: solely the conveyer of today's revenue
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          created_at: { gte: startOfToday, lt: endOfToday },
        },
        select: { amount_cents: true, currency: true, created_at: true },
      }),
      // Payments captured YESTERDAY: for daily delta comparisons
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          created_at: { gte: startOfYesterday, lt: startOfToday },
        },
        select: { amount_cents: true },
      }),
      // Payments captured this calendar year for monthly revenue curve
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          created_at: { gte: startOfYear, lt: endOfYear },
        },
        select: { amount_cents: true, created_at: true },
      }),
      // Confirmed/completed reservations this calendar year for stay revenue analytics
      prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
          check_in_date: { gte: startOfYear, lt: endOfYear },
        },
        select: { total_cents: true, check_in_date: true, created_at: true },
      }),
      prisma.refundRecord.findMany({
        where: { status: RefundStatus.PROCESSED },
        select: { amount_cents: true, currency: true },
      }),
      // Check-ins today: processed (checked-in or checked-out) vs pending (confirmed)
      prisma.reservation.count({
        where: {
          check_in_date: { gte: startOfToday, lt: endOfToday },
          status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
        },
      }),
      prisma.reservation.count({
        where: {
          check_in_date: { gte: startOfToday, lt: endOfToday },
          status: ReservationStatus.CONFIRMED,
        },
      }),
      // Platform audit & governance logs
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 6,
      }),
      // Recent reservations for booking schedule feed
      prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
        },
        include: {
          hotel: { select: { id: true, name: true, city: true } },
          rooms: {
            include: {
              room_type: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),
      // Active properties with verified room counts
      prisma.hotel.findMany({
        where: { status: HotelStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          _count: {
            select: { rooms: { where: { is_active: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      // Room operational status distribution across platform
      prisma.room.groupBy({
        by: ['operational_status'],
        where: { is_active: true },
        _count: { id: true },
      }),
    ]);

    // Batch resolve hotel names for recent audit logs
    const auditHotelIds = Array.from(new Set(recentAuditLogs.map((l) => l.hotel_id).filter(Boolean))) as string[];
    const auditHotels = auditHotelIds.length > 0
      ? await prisma.hotel.findMany({
          where: { id: { in: auditHotelIds } },
          select: { id: true, name: true },
        })
      : [];
    const auditHotelMap = new Map(auditHotels.map((h) => [h.id, h.name]));

    // Financial calculations
    let grossVolumeCents = 0;
    for (const p of successfulPayments) {
      grossVolumeCents += p.amount_cents;
    }

    let refundedVolumeCents = 0;
    for (const r of processedRefunds) {
      refundedVolumeCents += r.amount_cents;
    }

    const netVolumeCents = grossVolumeCents - refundedVolumeCents;

    let todayRevenueCents = 0;
    for (const p of todayPayments) {
      todayRevenueCents += p.amount_cents;
    }

    let yesterdayRevenueCents = 0;
    for (const p of yesterdayPayments) {
      yesterdayRevenueCents += p.amount_cents;
    }

    let revenueChangePercent = 0;
    let revenueChangeLabel = 'Live payments recorded';
    if (yesterdayRevenueCents > 0) {
      revenueChangePercent = Math.round(((todayRevenueCents - yesterdayRevenueCents) / yesterdayRevenueCents) * 100);
      revenueChangeLabel = `${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent}% vs yesterday`;
    } else if (todayRevenueCents > 0) {
      revenueChangePercent = 100;
      revenueChangeLabel = '+100% vs yesterday';
    } else {
      revenueChangePercent = 0;
      revenueChangeLabel = '0% vs yesterday';
    }

    let todayRealizedRevenueCents = 0;
    for (const r of yearlyReservations) {
      const rTime = new Date(r.check_in_date).getTime();
      if (rTime >= startOfToday.getTime() && rTime < endOfToday.getTime()) {
        todayRealizedRevenueCents += r.total_cents;
      }
    }

    // Multi-timeframe analytics for Cash Inflow (Booking Date) & Realized Stay Revenue (Check-In Date)
    const analytics = computeRevenueAnalytics(yearlyPayments, yearlyReservations, now);

    // Monthly breakdown for current calendar year
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = monthLabels.map((month) => ({
      month,
      revenueCents: 0,
      revenueFormatted: '₹0',
      transactionsCount: 0,
    }));

    let annualGrossRevenueCents = 0;
    for (const payment of yearlyPayments) {
      const m = payment.created_at.getMonth();
      if (m >= 0 && m < 12) {
        monthlyRevenue[m].revenueCents += payment.amount_cents;
        monthlyRevenue[m].transactionsCount += 1;
        annualGrossRevenueCents += payment.amount_cents;
      }
    }

    for (const item of monthlyRevenue) {
      item.revenueFormatted = formatCurrencyMinor(item.revenueCents, 'INR');
    }

    // Reservation breakdown by status
    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const item of reservationsByStatus) {
      statusCounts[item.status] = item._count.id;
    }

    const totalCheckInsToday = checkInsProcessedCount + checkInsPendingCount;
    const occupancyRatePercent = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Live portfolio room distribution across partner hotels
    const totalActiveRoomsInPortfolio = hotelsWithRooms.reduce((sum, h) => sum + h._count.rooms, 0);
    const portfolioDistribution = hotelsWithRooms.map((h) => ({
      hotelId: h.id,
      hotelName: h.name,
      city: h.city,
      category: h.category,
      roomCount: h._count.rooms,
      percentage: totalActiveRoomsInPortfolio > 0
        ? Number(((h._count.rooms / totalActiveRoomsInPortfolio) * 100).toFixed(1))
        : 0,
    }));

    // Operational room status distribution across all properties
    const operationalStatusCounts: Record<string, number> = {
      READY: 0,
      OCCUPIED: 0,
      DIRTY: 0,
      CLEANING: 0,
      INSPECTION: 0,
      MAINTENANCE: 0,
    };
    for (const item of roomStatusGroups) {
      operationalStatusCounts[item.operational_status] = item._count.id;
    }

    return {
      portfolioDistribution,
      operationalStatusCounts,
      hotels: {
        total: totalHotels,
        active: activeHotels,
        suspended: suspendedHotels,
      },
      inventory: {
        totalRoomsAcrossPlatform: totalRooms,
        totalRooms,
        occupiedRooms,
        occupancyRatePercent,
      },
      rooms: {
        totalRooms,
        occupiedRooms,
      },
      bookings: {
        totalCount: totalReservations,
        statusBreakdown: statusCounts,
        todayCheckInsCount: totalCheckInsToday,
        checkInsProcessedCount,
        checkInsPendingCount,
      },
      reservations: {
        total: totalReservations,
        confirmed: statusCounts[ReservationStatus.CONFIRMED] || 0,
        checkedIn: statusCounts[ReservationStatus.CHECKED_IN] || 0,
        checkedOut: statusCounts[ReservationStatus.CHECKED_OUT] || 0,
        cancelled: statusCounts[ReservationStatus.CANCELLED] || 0,
        recent: recentReservations.map((res) => ({
          id: res.id,
          reservationCode: res.reservation_code,
          guestName: res.guest_name || 'Guest',
          hotelName: res.hotel?.name || 'Hotel',
          hotelCity: res.hotel?.city || '',
          roomTypeName: res.rooms?.[0]?.room_type?.name || 'Room',
          checkInDate: res.check_in_date.toISOString(),
          checkOutDate: res.check_out_date.toISOString(),
          status: res.status,
          totalFormatted: formatCurrencyMinor(res.total_cents, 'INR'),
        })),
      },
      auditLogs: {
        total: totalAuditLogs,
        recent: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          actorRole: log.actor_role || 'SYSTEM',
          entityType: log.entity_type,
          entityId: log.entity_id,
          hotelName: log.hotel_id ? auditHotelMap.get(log.hotel_id) || null : null,
          createdAt: log.created_at.toISOString(),
          ipAddress: log.ip_address || null,
        })),
      },
      tasks: {
        total: 0,
        open: 0,
        completed: 0,
        recent: [],
      },
      financials: {
        todayRevenueCents,
        todayRevenueFormatted: formatCurrencyMinor(todayRevenueCents, 'INR'),
        todayRealizedRevenueCents,
        todayRealizedRevenueFormatted: formatCurrencyMinor(todayRealizedRevenueCents, 'INR'),
        todayRealizedRevenueLabel: 'From arrivals & stays today',
        yesterdayRevenueCents,
        yesterdayRevenueFormatted: formatCurrencyMinor(yesterdayRevenueCents, 'INR'),
        revenueChangePercent,
        revenueChangeLabel,
        grossVolumeCents,
        refundedVolumeCents,
        netVolumeCents,
        successfulPaymentsCount: successfulPayments.length,
        processedRefundsCount: processedRefunds.length,
        grossRevenueFormatted: formatCurrencyMinor(grossVolumeCents, 'INR'),
        platformNetRevenueFormatted: formatCurrencyMinor(netVolumeCents, 'INR'),
        annualGrossRevenueCents,
        annualGrossRevenueFormatted: formatCurrencyMinor(annualGrossRevenueCents, 'INR'),
        analytics,
        monthlyRevenue,
      },
    };
  }

  /**
   * Retrieves platform-wide audit activity logs.
   */
  async listAuditLogs(limit: number = 50) {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const hotelIds = Array.from(new Set(logs.map((l) => l.hotel_id).filter(Boolean))) as string[];
    const hotels = hotelIds.length > 0
      ? await prisma.hotel.findMany({
          where: { id: { in: hotelIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const hotelMap = new Map(hotels.map((h) => [h.id, h]));

    return logs.map((log) => ({
      ...log,
      hotel: log.hotel_id ? hotelMap.get(log.hotel_id) || null : null,
    }));
  }
}

export const adminService = new AdminService();

