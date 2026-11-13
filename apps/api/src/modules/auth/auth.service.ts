// apps/api/src/modules/auth/auth.service.ts
import { prisma } from '@hbms/database';
import { RegisterInput, LoginInput, Role, UserStatus, ApplicationStatus, AuthResponse, UserSummary } from '@hbms/shared';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { generateAccessToken, generateRefreshTokenString, hashToken } from '../../common/utils/token';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors';
import { logAuditEvent } from '../../common/utils/audit';

export class AuthService {
  async register(input: RegisterInput, ipAddress?: string): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
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

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        ip_address: ipAddress,
        expires_at: expiresAt,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        status: user.status as UserStatus,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
      },
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        managed_hotel: { select: { id: true } },
        staff_profile: { select: { hotel_id: true, is_active: true } },
        applications: {
          select: { id: true, status: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Your account has been suspended. Please contact platform administration.');
    }

    const isValid = await verifyPassword(input.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Determine assigned hotelId if manager or staff
    let hotelId: string | null = null;
    if (user.role === Role.HOTEL_MANAGER && user.managed_hotel) {
      hotelId = user.managed_hotel.id;
    } else if ((user.role === Role.RECEPTIONIST || user.role === Role.HOUSEKEEPING) && user.staff_profile) {
      hotelId = user.staff_profile.hotel_id;
    }

    const hasActiveApplication = Boolean(
      user.applications &&
      user.applications.length > 0 &&
      user.applications[0].status !== ApplicationStatus.REJECTED
    );

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      hotelId,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
      },
    });

    await logAuditEvent({
      hotelId,
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        status: user.status as UserStatus,
        hotelId,
        hasActiveApplication,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
      },
    };
  }

  async refreshToken(rawRefreshToken: string, ipAddress?: string): Promise<AuthResponse> {
    const tokenHash = hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: {
        user: {
          include: {
            managed_hotel: { select: { id: true } },
            staff_profile: { select: { hotel_id: true, is_active: true } },
            applications: {
              select: { id: true, status: true },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.is_revoked || tokenRecord.expires_at < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = tokenRecord.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User account suspended');
    }

    // Revoke current refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { is_revoked: true },
    });

    let hotelId: string | null = null;
    if (user.role === Role.HOTEL_MANAGER && user.managed_hotel) {
      hotelId = user.managed_hotel.id;
    } else if ((user.role === Role.RECEPTIONIST || user.role === Role.HOUSEKEEPING) && user.staff_profile) {
      hotelId = user.staff_profile.hotel_id;
    }

    const hasActiveApplication = Boolean(
      user.applications &&
      user.applications.length > 0 &&
      user.applications[0].status !== ApplicationStatus.REJECTED
    );

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      hotelId,
    });

    const newRawRefreshToken = generateRefreshTokenString();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: newTokenHash,
        ip_address: ipAddress,
        expires_at: expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        status: user.status as UserStatus,
        hotelId,
        hasActiveApplication,
      },
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
      },
    };
  }

  async logout(rawRefreshToken: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash },
        data: { is_revoked: true },
      });
    }

    if (userId) {
      await logAuditEvent({
        actorId: userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
      });
    }
  }

  async getMe(userId: string): Promise<UserSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        managed_hotel: { select: { id: true, name: true, slug: true } },
        staff_profile: { select: { hotel_id: true, role: true, is_active: true } },
        applications: {
          select: { id: true, status: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    let hotelId: string | null = null;
    if (user.role === Role.HOTEL_MANAGER && user.managed_hotel) {
      hotelId = user.managed_hotel.id;
    } else if (user.staff_profile) {
      hotelId = user.staff_profile.hotel_id;
    }

    const hasActiveApplication = Boolean(
      user.applications &&
      user.applications.length > 0 &&
      user.applications[0].status !== ApplicationStatus.REJECTED
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      status: user.status as UserStatus,
      hotelId,
      hasActiveApplication,
    };
  }
}

export const authService = new AuthService();

