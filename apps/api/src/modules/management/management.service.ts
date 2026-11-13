// apps/api/src/modules/management/management.service.ts
import { prisma } from '@hbms/database';
import { CreateStaffInput, UpdateStaffStatusInput, Role, UserStatus, formatCurrencyMinor } from '@hbms/shared';
import { hashPassword } from '../../common/utils/password';
import { ConflictError, NotFoundError, ForbiddenError } from '../../common/errors';
import { logAuditEvent } from '../../common/utils/audit';
import { computeRevenueAnalytics } from '../../common/utils/revenueAnalytics';

export class ManagementService {
  async getManagedHotel(managerUserId: string, targetHotelId?: string) {
    if (targetHotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: targetHotelId },
        include: {
          manager: {
            select: { id: true, first_name: true, last_name: true, email: true, phone: true },
          },
          _count: {
            select: { rooms: true, room_types: true, staff: true, reservations: true },
          },
        },
      });
      if (hotel) return hotel;
    }

    let hotel = await prisma.hotel.findUnique({
      where: { manager_id: managerUserId },
      include: {
        manager: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        _count: {
          select: { rooms: true, room_types: true, staff: true, reservations: true },
        },
      },
    });

    if (!hotel) {
      const staffProfile = await prisma.staffProfile.findUnique({
        where: { user_id: managerUserId },
        include: {
          hotel: {
            include: {
              manager: {
                select: { id: true, first_name: true, last_name: true, email: true, phone: true },
              },
              _count: {
                select: { rooms: true, room_types: true, staff: true, reservations: true },
              },
            },
          },
        },
      });
      if (staffProfile?.hotel) {
        hotel = staffProfile.hotel as any;
      }
    }

    if (!hotel) {
      throw new NotFoundError('You are not currently assigned as staff or manager to any active hotel.');
    }

    return hotel;
  }

  async updateHotelProfile(managerUserId: string, data: any, ipAddress?: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { manager_id: managerUserId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found for this manager');
    }

    const updated = await prisma.hotel.update({
      where: { id: hotel.id },
      data: {
        description: data.description ?? hotel.description,
        phone: data.phone ?? hotel.phone,
        email: data.email ?? hotel.email,
        check_in_time: data.checkInTime ?? hotel.check_in_time,
        check_out_time: data.checkOutTime ?? hotel.check_out_time,
        tax_rate_bps:
          data.taxRateBps !== undefined
            ? data.taxRateBps
            : data.taxRate !== undefined
            ? Math.round(data.taxRate * 100)
            : hotel.tax_rate_bps,
      },
    });

    await logAuditEvent({
      hotelId: hotel.id,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'HOTEL_PROFILE_UPDATED',
      entityType: 'Hotel',
      entityId: hotel.id,
      ipAddress,
    });

    return updated;
  }

  async listStaff(hotelId: string) {
    return prisma.staffProfile.findMany({
      where: { hotel_id: hotelId },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true, status: true },
        },
        assigned_by: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createStaffMember(
    managerUserId: string,
    hotelId: string,
    input: CreateStaffInput,
    ipAddress?: string
  ) {
    // Verify user doesn't already exist
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    // Atomically create user and staff profile bound to this hotel
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          role: input.role,
          status: UserStatus.ACTIVE,
        },
      });

      const staff = await tx.staffProfile.create({
        data: {
          user_id: user.id,
          hotel_id: hotelId,
          role: input.role,
          assigned_by_id: managerUserId,
          is_active: true,
        },
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true, phone: true, status: true },
          },
        },
      });

      return staff;
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'STAFF_MEMBER_CREATED',
      entityType: 'StaffProfile',
      entityId: result.id,
      newState: { role: input.role, email: input.email },
      ipAddress,
    });

    return result;
  }

  async updateStaffStatus(
    hotelId: string,
    staffId: string,
    input: UpdateStaffStatusInput,
    managerUserId: string,
    ipAddress?: string
  ) {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.hotel_id !== hotelId) {
      throw new NotFoundError('Staff member not found in your hotel roster');
    }

    const updated = await prisma.staffProfile.update({
      where: { id: staffId },
      data: { is_active: input.isActive },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, status: true },
        },
      },
    });

    await logAuditEvent({
      hotelId,
      actorId: managerUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'STAFF_STATUS_UPDATED',
      entityType: 'StaffProfile',
      entityId: staffId,
      newState: { isActive: input.isActive },
      ipAddress,
    });

    return updated;
  }

  /**
   * Generates comprehensive daily occupancy, revenue, utilization, and housekeeping reports
   * derived entirely from actual live database records.
   */
  async getDailyOperationsReport(hotelId: string, dateStr?: string) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const dateFormatted = targetDate.toISOString().split('T')[0];

    // 1. Physical Room Distribution
    const rooms = await prisma.room.findMany({
      where: { hotel_id: hotelId, is_active: true },
      select: { id: true, room_number: true, floor: true, operational_status: true },
    });

    const roomStatusCounts = {
      READY: 0,
      OCCUPIED: 0,
      DIRTY: 0,
      CLEANING: 0,
      INSPECTION: 0,
      MAINTENANCE: 0,
    };

    for (const r of rooms) {
      if (roomStatusCounts[r.operational_status] !== undefined) {
        roomStatusCounts[r.operational_status]++;
      }
    }

    // 2. Arrivals, Departures, and In-House stays
    const [arrivalsCount, departuresCount, inHouseRes] = await Promise.all([
      prisma.reservation.count({
        where: {
          hotel_id: hotelId,
          check_in_date: { gte: targetDate, lt: nextDate },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      }),
      prisma.reservation.count({
        where: {
          hotel_id: hotelId,
          check_out_date: { gte: targetDate, lt: nextDate },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      prisma.reservation.findMany({
        where: {
          hotel_id: hotelId,
          check_in_date: { lte: targetDate },
          check_out_date: { gt: targetDate },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        include: {
          rooms: true,
        },
      }),
    ]);

    // 3. Occupancy & Revenue calculations
    const totalRooms = rooms.length;
    const occupiedRooms = roomStatusCounts.OCCUPIED;
    const occupancyRatePercent =
      totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;

    let dailyRevenueCents = 0;
    for (const res of inHouseRes) {
      for (const rr of res.rooms) {
        // Find snapshot rate for this date if present, or average nightly rate
        const dateMatch = rr.nightly_breakdown?.find((nb: any) => nb.date === dateFormatted);
        if (dateMatch) {
          dailyRevenueCents += dateMatch.rate_cents * rr.quantity;
        } else {
          dailyRevenueCents += rr.nightly_rate_cents * rr.quantity;
        }
      }
    }

    // Today's payments captured for this hotel (cash basis / payments conveyer)
    const todayHotelPayments = await prisma.payment.findMany({
      where: {
        reservation: { hotel_id: hotelId },
        status: 'SUCCESS',
        created_at: { gte: targetDate, lt: nextDate },
      },
      select: { amount_cents: true },
    });
    const paymentsCollectedTodayCents = todayHotelPayments.reduce((sum, p) => sum + p.amount_cents, 0);
    const effectiveDailyRevenueCents = paymentsCollectedTodayCents > 0 ? paymentsCollectedTodayCents : dailyRevenueCents;

    const revPARCents = totalRooms > 0 ? Math.round(effectiveDailyRevenueCents / totalRooms) : 0;
    const adrCents = occupiedRooms > 0 ? Math.round(effectiveDailyRevenueCents / occupiedRooms) : 0;

    // 4. Housekeeping performance
    const [tasksToday, completedCleansToday] = await Promise.all([
      prisma.housekeepingTask.count({
        where: {
          hotel_id: hotelId,
          created_at: { gte: targetDate, lt: nextDate },
        },
      }),
      prisma.housekeepingTask.count({
        where: {
          hotel_id: hotelId,
          status: 'COMPLETED',
          completed_at: { gte: targetDate, lt: nextDate },
        },
      }),
    ]);

    // 5. Open Maintenance Issues
    const openMaintenanceIssues = await prisma.maintenanceIssue.findMany({
      where: {
        hotel_id: hotelId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    // 6. Recent Audit Activity
    const recentAuditLogs = await prisma.auditLog.findMany({
      where: { hotel_id: hotelId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    // 7. Monthly Revenue Query (Real Database Payments for Current Calendar Year)
    const currentYear = targetDate.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(currentYear + 1, 0, 1, 0, 0, 0, 0));

    const yearlyPayments = await prisma.payment.findMany({
      where: {
        reservation: { hotel_id: hotelId },
        status: 'SUCCESS',
        created_at: { gte: startOfYear, lt: endOfYear },
      },
      select: {
        amount_cents: true,
        created_at: true,
      },
    });

    const yearlyReservations = await prisma.reservation.findMany({
      where: {
        hotel_id: hotelId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] as any },
        check_in_date: { gte: startOfYear, lt: endOfYear },
      },
      select: {
        total_cents: true,
        check_in_date: true,
        created_at: true,
      },
    });

    const analytics = computeRevenueAnalytics(yearlyPayments, yearlyReservations, targetDate);

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = monthLabels.map((month) => ({
      month,
      revenueCents: 0,
      revenueFormatted: '₹0',
      transactionsCount: 0,
    }));

    let annualGrossRevenueCents = 0;
    for (const payment of yearlyPayments) {
      const m = payment.created_at.getUTCMonth();
      if (m >= 0 && m < 12) {
        monthlyRevenue[m].revenueCents += payment.amount_cents;
        monthlyRevenue[m].transactionsCount += 1;
        annualGrossRevenueCents += payment.amount_cents;
      }
    }

    for (const item of monthlyRevenue) {
      item.revenueFormatted = formatCurrencyMinor(item.revenueCents, 'INR');
    }

    // 8. Room Category Inventory & Capacity (Real Database Room Types)
    const roomTypes = await prisma.roomType.findMany({
      where: { hotel_id: hotelId, is_active: true },
      include: {
        rooms: {
          select: { id: true, room_number: true, operational_status: true },
        },
        rate_plans: {
          where: { is_active: true },
          select: { id: true, name: true, base_price_cents: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const roomCategories = roomTypes.map((rt) => {
      const roomCount = rt.rooms.length;
      const percentage = totalRooms > 0 ? Number(((roomCount / totalRooms) * 100).toFixed(1)) : 0;
      const basePriceCents = rt.rate_plans[0]?.base_price_cents || 0;
      const readyCount = rt.rooms.filter((r) => r.operational_status === 'READY').length;
      const occupiedCount = rt.rooms.filter((r) => r.operational_status === 'OCCUPIED').length;

      return {
        id: rt.id,
        name: rt.name,
        slug: rt.slug,
        bedType: rt.bed_type,
        maxGuests: rt.max_guests,
        roomCount,
        percentage,
        basePriceCents,
        basePriceFormatted: formatCurrencyMinor(basePriceCents, 'INR'),
        readyCount,
        occupiedCount,
      };
    });

    // 9. Structured Physical Room Status Breakdown List
    const roomStatusList = [
      {
        status: 'READY',
        label: 'Ready for Check-In',
        count: roomStatusCounts.READY,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.READY / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        description: 'Cleaned, inspected, and primed for immediate guest allocation',
      },
      {
        status: 'OCCUPIED',
        label: 'Occupied (In-House)',
        count: roomStatusCounts.OCCUPIED,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.OCCUPIED / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-neutral-800',
        textColor: 'text-neutral-800',
        badgeColor: 'text-neutral-800 bg-neutral-100 border-neutral-300',
        description: 'Active checked-in guests currently residing in room',
      },
      {
        status: 'DIRTY',
        label: 'Dirty (Post-Checkout)',
        count: roomStatusCounts.DIRTY,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.DIRTY / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-red-500',
        textColor: 'text-red-700',
        badgeColor: 'text-red-700 bg-red-50 border-red-200',
        description: 'Awaiting turnover housekeeping dispatch following departure',
      },
      {
        status: 'CLEANING',
        label: 'Cleaning in Progress',
        count: roomStatusCounts.CLEANING,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.CLEANING / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
        description: 'Assigned housekeeping team actively refreshing chamber',
      },
      {
        status: 'INSPECTION',
        label: 'Under Inspection',
        count: roomStatusCounts.INSPECTION,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.INSPECTION / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-indigo-500',
        textColor: 'text-indigo-700',
        badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        description: 'Cleaning complete; awaiting managerial quality sign-off',
      },
      {
        status: 'MAINTENANCE',
        label: 'Out of Order / Repair',
        count: roomStatusCounts.MAINTENANCE,
        percentage: totalRooms > 0 ? Number(((roomStatusCounts.MAINTENANCE / totalRooms) * 100).toFixed(1)) : 0,
        color: 'bg-rose-500',
        textColor: 'text-rose-700',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        description: 'Blocked from sale for mechanical or cosmetic repairs',
      },
    ];

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { currency: true, name: true },
    });

    const currency = hotel?.currency || 'INR';

    return {
      hotelName: hotel?.name,
      currency,
      date: dateFormatted,
      reportDate: dateFormatted,
      totalRooms,
      inventory: {
        totalRooms,
        statusCounts: roomStatusCounts,
        occupancyRatePercent,
      },
      occupancy: {
        occupiedRooms,
        totalRooms,
        occupancyRateFormatted: `${occupancyRatePercent.toFixed(1)}%`,
        occupancyRatePercent,
      },
      frontDesk: {
        arrivalsCount,
        departuresCount,
        inHouseCount: inHouseRes.length,
        inHouseReservationsCount: inHouseRes.length,
      },
      revenue: {
        dailyRevenueCents: effectiveDailyRevenueCents,
        inHouseStayRevenueCents: dailyRevenueCents,
        paymentsCollectedTodayCents,
        todayCashInflowCents: paymentsCollectedTodayCents,
        todayCashInflowFormatted: formatCurrencyMinor(paymentsCollectedTodayCents, 'INR'),
        todayStayRevenueCents: dailyRevenueCents,
        todayStayRevenueFormatted: formatCurrencyMinor(dailyRevenueCents, 'INR'),
        revPARCents,
        adrCents,
        totalRevenueCents: effectiveDailyRevenueCents,
        totalRevenueFormatted: formatCurrencyMinor(effectiveDailyRevenueCents, 'INR'),
        annualGrossRevenueCents,
        annualGrossRevenueFormatted: formatCurrencyMinor(annualGrossRevenueCents, 'INR'),
        revparCents: revPARCents,
        revparFormatted: formatCurrencyMinor(revPARCents, 'INR'),
        adrFormatted: formatCurrencyMinor(adrCents, 'INR'),
        analytics,
      },
      analytics,
      monthlyRevenue,
      roomCategories,
      roomStatusBreakdown: {
        ready: roomStatusCounts.READY,
        occupied: roomStatusCounts.OCCUPIED,
        dirty: roomStatusCounts.DIRTY,
        cleaning: roomStatusCounts.CLEANING,
        inspection: roomStatusCounts.INSPECTION,
        maintenance: roomStatusCounts.MAINTENANCE,
      },
      roomStatusList,
      housekeeping: {
        tasksToday,
        completedCleansToday,
        pendingOrActive: tasksToday - completedCleansToday,
        totalTasks: tasksToday,
        completedTasks: completedCleansToday,
        inProgressTasks: 0,
        pendingTasks: Math.max(0, tasksToday - completedCleansToday),
        completionRatePercent: tasksToday > 0 ? Math.round((completedCleansToday / tasksToday) * 100) : 100,
      },
      maintenance: {
        openIssuesCount: openMaintenanceIssues.length,
        openCount: openMaintenanceIssues.length,
        recentIssues: openMaintenanceIssues,
        openIssues: openMaintenanceIssues,
      },
      recentAuditLogs,
      auditHistory: recentAuditLogs,
    };
  }
}

export const managementService = new ManagementService();

