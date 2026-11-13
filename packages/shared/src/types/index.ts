// packages/shared/src/types/index.ts
import { Role, UserStatus, HotelStatus, ApplicationStatus, HotelCategory, OperationalStatus } from '../enums';

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: UserStatus;
  hotelId?: string | null; // Populated for HOTEL_MANAGER, RECEPTIONIST, HOUSEKEEPING
  hasActiveApplication?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserSummary;
  tokens: AuthTokens;
}

export interface StaffSummary {
  id: string;
  userId: string;
  hotelId: string;
  role: Role.RECEPTIONIST | Role.HOUSEKEEPING;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    status: UserStatus;
  };
  isActive: boolean;
  createdAt: string;
}

export interface HotelApplicationSummary {
  id: string;
  applicantUserId: string;
  applicant?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  hotelName: string;
  businessRegistrationNumber: string;
  taxId: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  category: HotelCategory;
  description?: string | null;
  status: ApplicationStatus;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HotelSummary {
  id: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  name: string;
  slug: string;
  description?: string | null;
  category: HotelCategory | string;
  starRating: number;
  star_rating?: number;
  guestRating?: number | null;
  totalReviews?: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  status: HotelStatus | string;
  checkInTime?: string;
  checkOutTime?: string;
  taxRate?: number;
  createdAt?: string;
  images?: string[];
}

export interface HotelGeoJsonProperties {
  id: string;
  name: string;
  slug: string;
  category: HotelCategory | string;
  star_rating: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  currency: string;
  starting_price_cents: number;
  total_rooms: number;
  reviews_count?: number;
  check_in_time?: string;
  check_out_time?: string;
  description?: string | null;
}

export interface HotelGeoJsonFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: HotelGeoJsonProperties;
}

export interface HotelGeoJsonCollection {
  type: 'FeatureCollection';
  features: HotelGeoJsonFeature[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

// ====================================================
// MILESTONE 3: RESERVATIONS, PAYMENTS & REFUNDS TYPES
// ====================================================

export interface PaymentSummary {
  id: string;
  reservationId: string;
  transactionReference: string;
  paymentProvider: string;
  paymentMethod: string;
  amountCents: number;
  currency: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

export interface RefundSummary {
  id: string;
  cancellationId: string;
  paymentId: string;
  refundReference: string;
  amountCents: number;
  currency: string;
  status: string;
  errorMessage?: string | null;
  processedAt?: string | null;
}

export interface CancellationSummary {
  id: string;
  reservationId: string;
  cancelledById?: string | null;
  cancellationReason?: string | null;
  policyApplied: string;
  eligibleRefundCents: number;
  cancellationFeeCents: number;
  currency: string;
  cancelledAt: string;
  refund?: RefundSummary | null;
}

export interface ReservationRoomSummary {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  cancellationPolicy: string;
  quantity: number;
  nightlyRateCents: number;
  totalPriceCents: number;
  nightlyBreakdown: { date: string; rate_cents: number; is_override: boolean }[];
  assignedRooms?: { roomNumber: string; slotIndex: number }[];
}

export interface ReservationDetail {
  id: string;
  reservationCode: string;
  hotelId: string;
  hotel: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    checkInTime: string;
    checkOutTime: string;
  };
  guestUserId?: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  totalRoomsCount: number;
  status: string;
  holdExpiresAt?: string | null;
  subtotalCents: number;
  taxCents: number;
  feesCents: number;
  totalCents: number;
  currency: string;
  isWalkIn: boolean;
  createdAt: string;
  updatedAt: string;
  rooms: ReservationRoomSummary[];
  payments: PaymentSummary[];
  cancellation?: CancellationSummary | null;
}

export interface CancellationPreviewResponse {
  reservationId: string;
  reservationCode: string;
  policyApplied: string;
  deadlineHours: number;
  isBeforeDeadline: boolean;
  totalPaidCents: number;
  eligibleRefundCents: number;
  cancellationFeeCents: number;
  currency: string;
  message: string;
}

// ====================================================
// HOTEL SEARCH & AVAILABILITY RESULTS
// ====================================================

export interface HotelSearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: HotelCategory | string;
  starRating: number;
  guestRating: number | null;
  totalReviews?: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  currency: string;
  coverImage: string;
  images: string[];
  amenities: string[];
  startingPriceCents: number;
  totalStayPriceCents: number;
  availableRoomTypesCount: number;
  totalAvailableRooms: number;
  isAvailable: boolean;
  checkInTime: string;
  checkOutTime: string;
}

export interface HotelSearchResponse {
  hotels: HotelSearchResult[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  appliedFilters: {
    destination?: string;
    checkInDate?: string;
    checkOutDate?: string;
    guests: number;
    rooms: number;
    minPrice?: number;
    maxPrice?: number;
    starRating?: number[];
    category?: string[];
    amenities?: string[];
    sort: string;
  };
}

// ====================================================
// REVIEWS & DETAILED ROOM TYPE
// ====================================================

export interface ReviewItem {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  stayDate?: string | null;
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  roomType?: {
    id: string;
    name: string;
    bedType?: string | null;
    capacity?: number | null;
    maxGuests?: number | null;
  } | null;
}

export interface ReviewSummary {
  averageRating: number | null;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  reviews: ReviewItem[];
}

export interface DetailedRoomType {
  id: string;
  hotelId: string;
  name: string;
  slug: string;
  description?: string | null;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  bedType: string;
  roomSizeSqm?: number | null;
  amenities: string[];
  images: string[];
  ratePlans: {
    id: string;
    name: string;
    description?: string | null;
    basePriceCents: number;
    cancellationPolicy: string;
    cancellationDeadlineHours: number;
    isDefault: boolean;
  }[];
  hotel: {
    id: string;
    name: string;
    slug: string;
    city: string;
    country: string;
    address: string;
    starRating: number;
    checkInTime: string;
    checkOutTime: string;
    taxRateBps: number;
    currency: string;
  };
  pricing?: {
    checkInDate: string;
    checkOutDate: string;
    totalNights: number;
    nightlyRateCents: number;
    subtotalCents: number;
    taxCents: number;
    feesCents: number;
    totalCents: number;
    currency: string;
  };
  reviewsSummary?: {
    averageRating: number | null;
    totalReviews: number;
  };
}


