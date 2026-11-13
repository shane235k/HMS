// apps/api/src/modules/applications/applications.service.ts
import { prisma } from '@hbms/database';
import {
  HotelApplicationInput,
  ReviewApplicationInput,
  ApplicationStatus,
  HotelStatus,
  Role,
} from '@hbms/shared';
import { ConflictError, NotFoundError, BadRequestError } from '../../common/errors';
import { logAuditEvent } from '../../common/utils/audit';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatApplication(app: any) {
  if (!app) return null;
  const { hotels, ...rest } = app;
  const hotel = hotels && hotels.length > 0 ? hotels[0] : null;

  const applicant = app.applicant
    ? {
        id: app.applicant.id,
        firstName: app.applicant.first_name ?? app.applicant.firstName ?? '',
        lastName: app.applicant.last_name ?? app.applicant.lastName ?? '',
        email: app.applicant.email ?? '',
        phone: app.applicant.phone ?? '',
        first_name: app.applicant.first_name ?? app.applicant.firstName ?? '',
        last_name: app.applicant.last_name ?? app.applicant.lastName ?? '',
      }
    : null;

  const reviewedBy = app.reviewed_by
    ? {
        id: app.reviewed_by.id,
        firstName: app.reviewed_by.first_name ?? app.reviewed_by.firstName ?? '',
        lastName: app.reviewed_by.last_name ?? app.reviewed_by.lastName ?? '',
        first_name: app.reviewed_by.first_name ?? app.reviewed_by.firstName ?? '',
        last_name: app.reviewed_by.last_name ?? app.reviewed_by.lastName ?? '',
      }
    : null;

  return {
    ...rest,
    id: app.id,
    applicantUserId: app.applicant_user_id ?? app.applicantUserId,
    applicant_user_id: app.applicant_user_id ?? app.applicantUserId,
    applicant,
    hotelName: app.hotel_name ?? app.hotelName,
    hotel_name: app.hotel_name ?? app.hotelName,
    businessRegistrationNumber: app.business_registration_number ?? app.businessRegistrationNumber,
    business_registration_number: app.business_registration_number ?? app.businessRegistrationNumber,
    taxId: app.tax_id ?? app.taxId,
    tax_id: app.tax_id ?? app.taxId,
    contactEmail: app.contact_email ?? app.contactEmail,
    contact_phone: app.contact_phone ?? app.contactPhone,
    contactPhone: app.contact_phone ?? app.contactPhone,
    address: app.address,
    city: app.city,
    state: app.state,
    country: app.country,
    postalCode: app.postal_code ?? app.postalCode,
    postal_code: app.postal_code ?? app.postalCode,
    latitude: app.latitude,
    longitude: app.longitude,
    category: app.category,
    checkInTime: app.check_in_time || '14:00',
    check_in_time: app.check_in_time || '14:00',
    checkOutTime: app.check_out_time || '11:00',
    check_out_time: app.check_out_time || '11:00',
    description: app.description,
    status: app.status,
    rejectionReason: app.rejection_reason ?? app.rejectionReason,
    rejection_reason: app.rejection_reason ?? app.rejectionReason,
    adminNotes: app.admin_notes ?? app.adminNotes,
    admin_notes: app.admin_notes ?? app.adminNotes,
    reviewedById: app.reviewed_by_id ?? app.reviewedById,
    reviewed_by_id: app.reviewed_by_id ?? app.reviewedById,
    reviewedBy,
    reviewed_by: reviewedBy,
    reviewedAt: app.reviewed_at ?? app.reviewedAt,
    reviewed_at: app.reviewed_at ?? app.reviewedAt,
    createdAt: app.created_at ?? app.createdAt,
    created_at: app.created_at ?? app.createdAt,
    updatedAt: app.updated_at ?? app.updatedAt,
    updated_at: app.updated_at ?? app.updatedAt,
    hotel,
  };
}

export class ApplicationsService {
  async submitApplication(applicantUserId: string, input: HotelApplicationInput, ipAddress?: string) {
    // 1. Verify user exists and doesn't already manage an active hotel
    const existingHotel = await prisma.hotel.findUnique({
      where: { manager_id: applicantUserId },
    });

    if (existingHotel) {
      throw new ConflictError('You already have an active hotel assigned. A manager can manage at most one hotel.');
    }

    // 2. Check for existing pending application
    const existingPending = await prisma.hotelApplication.findFirst({
      where: {
        applicant_user_id: applicantUserId,
        status: { in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW] },
      },
    });

    if (existingPending) {
      throw new ConflictError('You already have a hotel application currently pending or under review.');
    }

    // Ensure applicant has role HOTEL_MANAGER
    await prisma.user.update({
      where: { id: applicantUserId },
      data: { role: Role.HOTEL_MANAGER },
    });

    const application = await prisma.hotelApplication.create({
      data: {
        applicant_user_id: applicantUserId,
        hotel_name: input.hotelName,
        business_registration_number: input.businessRegistrationNumber,
        tax_id: input.taxId,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postal_code: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        category: input.category,
        check_in_time: input.checkInTime || '14:00',
        check_out_time: input.checkOutTime || '11:00',
        description: input.description,
        status: ApplicationStatus.PENDING,
      },
      include: {
        applicant: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    await logAuditEvent({
      actorId: applicantUserId,
      actorRole: Role.HOTEL_MANAGER,
      action: 'HOTEL_APPLICATION_SUBMITTED',
      entityType: 'HotelApplication',
      entityId: application.id,
      ipAddress,
    });

    return formatApplication(application);
  }

  async getMyApplication(applicantUserId: string) {
    const application = await prisma.hotelApplication.findFirst({
      where: { applicant_user_id: applicantUserId },
      orderBy: { created_at: 'desc' },
      include: {
        hotels: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    if (!application) return null;
    return formatApplication(application);
  }

  async listApplications(status?: ApplicationStatus) {
    const applications = await prisma.hotelApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        applicant: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        reviewed_by: {
          select: { id: true, first_name: true, last_name: true },
        },
        hotels: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    return applications.map(formatApplication);
  }

  async getApplicationById(id: string) {
    const application = await prisma.hotelApplication.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        reviewed_by: {
          select: { id: true, first_name: true, last_name: true },
        },
        hotels: true,
      },
    });

    if (!application) {
      throw new NotFoundError('Hotel application not found');
    }

    return formatApplication(application);
  }

  async reviewApplication(
    applicationId: string,
    adminUserId: string,
    input: ReviewApplicationInput,
    ipAddress?: string
  ) {
    const application = await prisma.hotelApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundError('Hotel application not found');
    }

    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestError('This hotel application has already been approved');
    }

    if (input.status === ApplicationStatus.APPROVED) {
      // Check if manager is already bound to another hotel (strict 1:1 rule)
      const existingManagerHotel = await prisma.hotel.findUnique({
        where: { manager_id: application.applicant_user_id },
      });

      if (existingManagerHotel) {
        throw new ConflictError(
          'The applicant already manages an active hotel. Exactly one designated manager per hotel is allowed.'
        );
      }

      // Generate unique slug
      let baseSlug = slugify(application.hotel_name);
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await prisma.hotel.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      // Execute approval atomically in database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update application status
        const updatedApp = await tx.hotelApplication.update({
          where: { id: applicationId },
          data: {
            status: ApplicationStatus.APPROVED,
            admin_notes: input.adminNotes,
            reviewed_by_id: adminUserId,
            reviewed_at: new Date(),
          },
        });

        // 2. Create official Hotel record
        const hotel = await tx.hotel.create({
          data: {
            application_id: application.id,
            manager_id: application.applicant_user_id,
            name: application.hotel_name,
            slug: uniqueSlug,
            description: application.description,
            category: application.category,
            star_rating: 4,
            address: application.address,
            city: application.city,
            state: application.state,
            country: application.country,
            postal_code: application.postal_code,
            location: {
              type: 'Point',
              coordinates: [application.longitude, application.latitude],
            },
            latitude: application.latitude,
            longitude: application.longitude,
            phone: application.contact_phone,
            email: application.contact_email,
            status: HotelStatus.ACTIVE,
            currency: 'INR',
            check_in_time: application.check_in_time || '14:00',
            check_out_time: application.check_out_time || '11:00',
            tax_rate_bps: 1200,
          },
        });

        return { application: formatApplication(updatedApp), hotel };
      });

      await logAuditEvent({
        hotelId: result.hotel.id,
        actorId: adminUserId,
        actorRole: Role.PLATFORM_ADMIN,
        action: 'HOTEL_APPLICATION_APPROVED',
        entityType: 'HotelApplication',
        entityId: applicationId,
        newState: { hotelId: result.hotel.id, hotelName: result.hotel.name },
        ipAddress,
      });

      return result;
    } else {
      // Rejection or Resubmission Requested
      const updated = await prisma.hotelApplication.update({
        where: { id: applicationId },
        data: {
          status: input.status,
          rejection_reason: input.rejectionReason,
          admin_notes: input.adminNotes,
          reviewed_by_id: adminUserId,
          reviewed_at: new Date(),
        },
      });

      await logAuditEvent({
        actorId: adminUserId,
        actorRole: Role.PLATFORM_ADMIN,
        action: `HOTEL_APPLICATION_${input.status}`,
        entityType: 'HotelApplication',
        entityId: applicationId,
        newState: { status: input.status, reason: input.rejectionReason },
        ipAddress,
      });

      return { application: formatApplication(updated) };
    }
  }
}

export const applicationsService = new ApplicationsService();

