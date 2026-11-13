// apps/api/src/modules/housekeeping/housekeeping.service.ts
import { prisma } from '@hbms/database';
import {
  OperationalStatus,
  TaskStatus,
  MaintenanceStatus,
  MaintenancePriority,
  Role,
  CreateMaintenanceIssueInput,
} from '@hbms/shared';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors';

export class HousekeepingService {
  /**
   * Retrieves summary metrics for the housekeeping dashboard.
   */
  async getDashboard(hotelId: string) {
    const rooms = await prisma.room.findMany({
      where: { hotel_id: hotelId, is_active: true },
      select: { operational_status: true },
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

    const tasks = await prisma.housekeepingTask.findMany({
      where: { hotel_id: hotelId },
      select: { status: true },
    });

    const taskStatusCounts = {
      PENDING: 0,
      IN_PROGRESS: 0,
      AWAITING_INSPECTION: 0,
      COMPLETED: 0,
    };

    for (const t of tasks) {
      if (taskStatusCounts[t.status] !== undefined) {
        taskStatusCounts[t.status]++;
      }
    }

    const openMaintenanceCount = await prisma.maintenanceIssue.count({
      where: { hotel_id: hotelId, status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
    });

    return {
      totalRooms: rooms.length,
      roomStatusCounts,
      taskStatusCounts,
      openMaintenanceCount,
    };
  }

  /**
   * Lists physical rooms for housekeeping queues with active task info.
   */
  async getRooms(hotelId: string, status?: OperationalStatus, floor?: number) {
    const where: any = { hotel_id: hotelId, is_active: true };
    if (status) where.operational_status = status;
    if (floor !== undefined) where.floor = floor;

    return await prisma.room.findMany({
      where,
      include: {
        room_type: { select: { id: true, name: true, bed_type: true } },
      },
      orderBy: [{ floor: 'asc' }, { room_number: 'asc' }],
    });
  }

  /**
   * Lists housekeeping tasks with optional status and assignment filtering.
   */
  async getTasks(hotelId: string, status?: TaskStatus, assignedToId?: string) {
    const where: any = { hotel_id: hotelId };
    if (status) where.status = status;
    if (assignedToId) where.assigned_to_id = assignedToId;

    const tasks = await prisma.housekeepingTask.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const roomIds = Array.from(new Set(tasks.map((t) => t.room_id).filter(Boolean)));
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        room_type: { select: { id: true, name: true, bed_type: true } },
      },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const staffIds = Array.from(new Set(tasks.map((t) => t.assigned_to_id).filter(Boolean))) as string[];
    const staffUsers = staffIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, first_name: true, last_name: true },
    }) : [];
    const staffMap = new Map(staffUsers.map((u) => [u.id, u]));

    return tasks.map((t) => ({
      id: t.id,
      type: t.task_type,
      status: t.status,
      notes: t.notes,
      started_at: t.started_at,
      completed_at: t.completed_at,
      assigned_to: t.assigned_to_id ? staffMap.get(t.assigned_to_id) : undefined,
      room: roomMap.get(t.room_id) || {
        id: t.room_id,
        room_number: 'N/A',
        floor: 1,
        operational_status: OperationalStatus.DIRTY,
        room_type: { name: 'Standard' },
      },
    }));
  }

  /**
   * Cleaner starts cleaning a room.
   * Transitions Task to IN_PROGRESS and Room to CLEANING.
   */
  async startCleaning(hotelId: string, taskId: string, staffUserId: string) {
    const task = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotel_id: hotelId },
    });

    if (!task) {
      throw new NotFoundError('Housekeeping task not found');
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestError('Task is already completed');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Room operational_status to CLEANING
      await tx.room.update({
        where: { id: task.room_id },
        data: {
          operational_status: OperationalStatus.CLEANING,
          version: { increment: 1 },
        },
      });

      // 2. Update Task
      return await tx.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          started_at: new Date(),
          assigned_to_id: task.assigned_to_id || staffUserId,
        },
      });
    });
  }

  /**
   * Cleaner completes cleaning and submits room for supervisor inspection.
   * Transitions Task to AWAITING_INSPECTION and Room to INSPECTION.
   */
  async submitForInspection(hotelId: string, taskId: string, notes?: string) {
    const task = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotel_id: hotelId },
    });

    if (!task) {
      throw new NotFoundError('Housekeeping task not found');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Room to INSPECTION
      await tx.room.update({
        where: { id: task.room_id },
        data: {
          operational_status: OperationalStatus.INSPECTION,
          version: { increment: 1 },
        },
      });

      // 2. Update Task to AWAITING_INSPECTION
      return await tx.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.AWAITING_INSPECTION,
          notes: notes ? (task.notes ? `${task.notes} | ${notes}` : notes) : task.notes,
        },
      });
    });
  }

  /**
   * Authorized Inspection Approval to READY.
   * Enforces role authorization: Pure HOUSEKEEPING cleaners cannot approve rooms without inspection permission.
   * Transitions Task to COMPLETED and Room to READY.
   */
  async approveInspection(
    hotelId: string,
    taskId: string,
    inspectorUserId: string,
    userRole: Role
  ) {
    // Inspection authorization check
    const isAuthorizedInspector =
      userRole === Role.HOTEL_MANAGER ||
      userRole === Role.PLATFORM_ADMIN ||
      userRole === Role.RECEPTIONIST;

    if (!isAuthorizedInspector) {
      throw new ForbiddenError(
        'Inspection authorization required: Housekeeping cleaners cannot mark rooms READY without supervisor approval.'
      );
    }

    const task = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotel_id: hotelId },
    });

    if (!task) {
      throw new NotFoundError('Housekeeping task not found');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Transition Room to READY
      await tx.room.update({
        where: { id: task.room_id },
        data: {
          operational_status: OperationalStatus.READY,
          version: { increment: 1 },
        },
      });

      // 2. Complete Task
      return await tx.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.COMPLETED,
          completed_at: new Date(),
          inspected_by_id: inspectorUserId,
        },
      });
    });
  }

  /**
   * Assigns task to staff.
   */
  async assignTask(hotelId: string, taskId: string, assignedToId: string) {
    const task = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotel_id: hotelId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return await prisma.housekeepingTask.update({
      where: { id: task.id },
      data: { assigned_to_id: assignedToId },
    });
  }

  /**
   * Reports a maintenance issue, transitioning room to MAINTENANCE.
   */
  async reportMaintenanceIssue(
    hotelId: string,
    input: CreateMaintenanceIssueInput,
    reportedById?: string
  ) {
    const room = await prisma.room.findFirst({
      where: { id: input.roomId, hotel_id: hotelId },
    });

    if (!room) {
      throw new NotFoundError('Room not found in this hotel');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Transition room to MAINTENANCE
      await tx.room.update({
        where: { id: room.id },
        data: {
          operational_status: OperationalStatus.MAINTENANCE,
          version: { increment: 1 },
        },
      });

      // 2. Create Issue record
      const issue = await tx.maintenanceIssue.create({
        data: {
          hotel_id: hotelId,
          room_id: room.id,
          reported_by_id: reportedById || null,
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          status: MaintenanceStatus.OPEN,
        },
      });

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          hotel_id: hotelId,
          actor_id: reportedById || null,
          actor_role: 'STAFF',
          action: 'MAINTENANCE_REPORTED',
          entity_type: 'MaintenanceIssue',
          entity_id: issue.id,
          new_state: `Room ${room.room_number} placed under MAINTENANCE: ${input.title}`,
        },
      });

      return issue;
    });
  }

  /**
   * Lists open or filtered maintenance issues.
   */
  async listMaintenanceIssues(hotelId: string, status?: MaintenanceStatus) {
    const where: any = { hotel_id: hotelId };
    if (status) where.status = status;

    const issues = await prisma.maintenanceIssue.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const roomIds = Array.from(new Set(issues.map((i) => i.room_id).filter(Boolean)));
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, room_number: true, floor: true, operational_status: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    return issues.map((i) => ({
      ...i,
      room: roomMap.get(i.room_id) || {
        id: i.room_id,
        room_number: 'N/A',
        floor: 1,
        operational_status: OperationalStatus.MAINTENANCE,
      },
    }));
  }

  /**
   * Resolves a maintenance issue, setting room to DIRTY for turnover cleaning.
   */
  async resolveMaintenanceIssue(hotelId: string, issueId: string, staffUserId?: string) {
    const issue = await prisma.maintenanceIssue.findFirst({
      where: { id: issueId, hotel_id: hotelId },
    });

    if (!issue) {
      throw new NotFoundError('Maintenance issue not found');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update room to DIRTY so it is cleaned and inspected
      await tx.room.update({
        where: { id: issue.room_id },
        data: {
          operational_status: OperationalStatus.DIRTY,
          version: { increment: 1 },
        },
      });

      // 2. Create turnover clean task
      await tx.housekeepingTask.create({
        data: {
          hotel_id: hotelId,
          room_id: issue.room_id,
          task_type: 'TURNOVER_CLEAN',
          status: TaskStatus.PENDING,
          notes: `Turnover cleaning after resolving maintenance issue: ${issue.title}`,
        },
      });

      // 3. Mark issue resolved
      return await tx.maintenanceIssue.update({
        where: { id: issue.id },
        data: {
          status: MaintenanceStatus.RESOLVED,
          resolved_at: new Date(),
        },
      });
    });
  }
}

export const housekeepingService = new HousekeepingService();

