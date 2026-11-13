// packages/shared/src/schemas/index.ts
import { z } from 'zod';
import {
  Role,
  HotelCategory,
  HotelStatus,
  ApplicationStatus,
  OperationalStatus,
  CancellationPolicy,
  MaintenancePriority,
  TaskStatus,
} from '../enums';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum([Role.GUEST, Role.HOTEL_MANAGER]).default(Role.GUEST),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const hotelApplicationSchema = z.object({
  hotelName: z.string().min(2, 'Hotel name is required'),
  businessRegistrationNumber: z.string().min(2, 'Business registration number is required'),
  taxId: z.string().min(2, 'Tax ID is required'),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().min(5, 'Valid contact phone is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State/Province is required'),
  country: z.string().min(2, 'Country is required'),
  postalCode: z.string().min(2, 'Postal code is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.nativeEnum(HotelCategory),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Check-in time must be in HH:MM format (e.g. 14:00)').optional().default('14:00'),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Check-out time must be in HH:MM format (e.g. 11:00)').optional().default('11:00'),
  description: z.string().optional(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum([
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.RESUBMISSION_REQUESTED,
  ]),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
});

export const createStaffSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum([Role.RECEPTIONIST, Role.HOUSEKEEPING]),
});

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
});

// ====================================================
// MILESTONE 2: INVENTORY, ROOMS, RATES & AVAILABILITY
// ====================================================

export const createRoomTypeSchema = z.object({
  name: z.string().min(2, 'Room type name must be at least 2 characters'),
  description: z.string().optional(),
  maxGuests: z.number().int().min(1, 'Max guests must be at least 1').default(2),
  maxAdults: z.number().int().min(1, 'Max adults must be at least 1').default(2),
  maxChildren: z.number().int().min(0, 'Max children cannot be negative').default(0),
  bedType: z.string().min(2).default('King Bed'),
  roomSizeSqm: z.number().positive().optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  basePriceCents: z.number().int().min(100, 'Base price must be at least 100 minor units').optional(),
});

export const updateRoomTypeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  maxGuests: z.number().int().min(1).optional(),
  maxAdults: z.number().int().min(1).optional(),
  maxChildren: z.number().int().min(0).optional(),
  bedType: z.string().min(2).optional(),
  roomSizeSqm: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId'),
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number().int().default(1),
  operationalStatus: z.nativeEnum(OperationalStatus).default(OperationalStatus.READY),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId').optional(),
  floor: z.number().int().optional(),
  operationalStatus: z.nativeEnum(OperationalStatus).optional(),
  isActive: z.boolean().optional(),
});

export const updateRoomOperationalStatusSchema = z.object({
  operationalStatus: z.nativeEnum(OperationalStatus),
});

export const createRoomBlockSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start date is required'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid end date is required'),
  reason: z.string().min(2, 'Reason for maintenance block is required'),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Start date must be strictly before end date', path: ['endDate'] }
);

export const createRatePlanSchema = z.object({
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId'),
  name: z.string().min(2, 'Rate plan name is required'),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(100, 'Base price must be at least 100 minor units'),
  cancellationPolicy: z.nativeEnum(CancellationPolicy).default(CancellationPolicy.FREE_CANCELLATION),
  cancellationDeadlineHours: z.number().int().min(0).default(48),
  isDefault: z.boolean().default(false),
});

export const updateRatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(100).optional(),
  cancellationPolicy: z.nativeEnum(CancellationPolicy).optional(),
  cancellationDeadlineHours: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const rateCalendarOverrideSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid date is required'),
  priceOverrideCents: z.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export const bulkRateCalendarOverrideSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start date is required'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid end date is required'),
  priceOverrideCents: z.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().default(true),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date cannot be after end date', path: ['endDate'] }
);

export const availabilityQuerySchema = z.object({
  checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-in date is required'),
  checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-out date is required'),
  guests: z.preprocess(
    (val) => (val === 'all' || val === '0' || val === 0 ? 'all' : val === undefined || val === '' ? 1 : Number(val)),
    z.union([z.literal('all'), z.number().int().min(1)])
  ).default(1),
  rooms: z.preprocess(
    (val) => (val === 'all' || val === '0' || val === 0 ? 'all' : val === undefined || val === '' ? 1 : Number(val)),
    z.union([z.literal('all'), z.number().int().min(1)])
  ).default(1),
  all: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
}).refine(
  (data) => new Date(data.checkInDate) < new Date(data.checkOutDate),
  { message: 'Check-in date must be strictly before check-out date', path: ['checkOutDate'] }
);

export const createHoldRoomItemSchema = z.object({
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId'),
  ratePlanId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ratePlanId ObjectId'),
  quantity: z.number().int().min(1).default(1),
});

export const createHoldSchema = z.object({
  checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-in date is required'),
  checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-out date is required'),
  guestName: z.string().min(2, 'Guest full name is required'),
  guestEmail: z.string().email('Valid guest email is required'),
  guestPhone: z.string().min(5, 'Valid guest phone is required'),
  rooms: z.array(createHoldRoomItemSchema).min(1, 'At least one room must be requested'),
  idempotencyKey: z.string().optional(),
}).refine(
  (data) => new Date(data.checkInDate) < new Date(data.checkOutDate),
  { message: 'Check-in date must be strictly before check-out date', path: ['checkOutDate'] }
);

// ====================================================
// MILESTONE 3: RESERVATION LIFECYCLE, PAYMENTS & REFUNDS
// ====================================================

export const cardDetailsSchema = z.object({
  cardNumber: z.string().min(12, 'Card number must be at least 12 digits').optional(),
  cardholderName: z.string().min(2, 'Cardholder name is required').optional(),
  expMonth: z.number().int().min(1).max(12).optional(),
  expYear: z.number().int().min(2024).max(2040).optional(),
  cvv: z.string().min(3).max(4).optional(),
});

export const confirmReservationSchema = z.object({
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  paymentMethod: z.string().default('CARD'),
  cardDetails: cardDetailsSchema.optional(),
  simulateDecline: z.boolean().optional(),
  simulateError: z.boolean().optional(),
});

export const cancelReservationSchema = z.object({
  reason: z.string().min(2, 'Cancellation reason is required').optional(),
  simulateFailure: z.boolean().optional(),
});

export const retryRefundSchema = z.object({
  idempotencyKey: z.string().optional(),
  simulateFailure: z.boolean().optional(),
});

// ====================================================
// MILESTONE 4: FRONT DESK, ROOM ASSIGNMENT, HOUSEKEEPING & ADMIN
// ====================================================

export const assignRoomSchema = z.object({
  reservationRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reservationRoomId ObjectId'),
  slotIndex: z.number().int().min(0).default(0),
  roomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomId ObjectId'),
  notes: z.string().optional(),
});

export const reassignRoomSchema = z.object({
  reservationRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reservationRoomId ObjectId'),
  slotIndex: z.number().int().min(0).default(0),
  newRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid newRoomId ObjectId'),
  notes: z.string().optional(),
});

export const releaseRoomAssignmentSchema = z.object({
  reservationRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reservationRoomId ObjectId'),
  slotIndex: z.number().int().min(0).default(0),
  reason: z.string().optional(),
});

export const walkInRoomItemSchema = z.object({
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId'),
  ratePlanId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ratePlanId ObjectId'),
  quantity: z.number().int().min(1).default(1),
  assignedRoomIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
});

export const walkInBookingSchema = z.object({
  guestName: z.string().min(2, 'Guest full name is required'),
  guestEmail: z.string().email('Valid guest email is required'),
  guestPhone: z.string().min(5, 'Valid guest phone is required'),
  checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-in date is required'),
  checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid check-out date is required'),
  rooms: z.array(walkInRoomItemSchema).min(1, 'At least one room required'),
  paymentMethod: z.string().default('CASH'),
  idempotencyKey: z.string().optional(),
}).refine(
  (data) => new Date(data.checkInDate) < new Date(data.checkOutDate),
  { message: 'Check-in date must be strictly before check-out date', path: ['checkOutDate'] }
);

export const assignHousekeepingTaskSchema = z.object({
  assignedToId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid staff userId ObjectId'),
});

export const updateHousekeepingTaskStatusSchema = z.object({
  notes: z.string().optional(),
});

export const createMaintenanceIssueSchema = z.object({
  roomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomId ObjectId'),
  title: z.string().min(3, 'Maintenance title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
});

export const updateHotelPlatformStatusSchema = z.object({
  status: z.nativeEnum(HotelStatus),
  reason: z.string().optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().max(120).optional(),
  comment: z.string().min(5, 'Review comment must be at least 5 characters').max(2000),
  roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId').optional(),
  stayDate: z.string().optional(),
  reservationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reservationId ObjectId').optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type HotelApplicationInput = z.infer<typeof hotelApplicationSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UpdateRoomOperationalStatusInput = z.infer<typeof updateRoomOperationalStatusSchema>;
export type CreateRoomBlockInput = z.infer<typeof createRoomBlockSchema>;
export type CreateRatePlanInput = z.infer<typeof createRatePlanSchema>;
export type UpdateRatePlanInput = z.infer<typeof updateRatePlanSchema>;
export type RateCalendarOverrideInput = z.infer<typeof rateCalendarOverrideSchema>;
export type BulkRateCalendarOverrideInput = z.infer<typeof bulkRateCalendarOverrideSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CreateHoldInput = z.infer<typeof createHoldSchema>;
export type CreateHoldRoomItemInput = z.infer<typeof createHoldRoomItemSchema>;

export type ConfirmReservationInput = z.infer<typeof confirmReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type RetryRefundInput = z.infer<typeof retryRefundSchema>;

export type AssignRoomInput = z.infer<typeof assignRoomSchema>;
export type ReassignRoomInput = z.infer<typeof reassignRoomSchema>;
export type ReleaseRoomAssignmentInput = z.infer<typeof releaseRoomAssignmentSchema>;
export type WalkInBookingInput = z.infer<typeof walkInBookingSchema>;
export type AssignHousekeepingTaskInput = z.infer<typeof assignHousekeepingTaskSchema>;
export type UpdateHousekeepingTaskStatusInput = z.infer<typeof updateHousekeepingTaskStatusSchema>;
export type CreateMaintenanceIssueInput = z.infer<typeof createMaintenanceIssueSchema>;
export type UpdateHotelPlatformStatusInput = z.infer<typeof updateHotelPlatformStatusSchema>;
