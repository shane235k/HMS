// packages/database/prisma/seed.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import {
  PrismaClient,
  Role,
  UserStatus,
  HotelStatus,
  ApplicationStatus,
  HotelCategory,
  OperationalStatus,
  CancellationPolicy,
  ReservationStatus,
  AssignmentStatus,
  PaymentStatus,
  TaskType,
  TaskStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { initializeMongoIndexes } from '../src/init-indexes';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================================');
  console.log('🚀 Sole Authoritative Database Seeding for HBMS on MongoDB Atlas');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // 1. PURGE EXISTING COLLECTIONS IN REVERSE DEPENDENCY ORDER
  // --------------------------------------------------------------------------
  console.log('--- 1. Purging existing database records ---');
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.maintenanceIssue.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.refundRecord.deleteMany();
  await prisma.cancellationRecord.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.roomAssignment.deleteMany();
  await prisma.reservationRoom.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.rateCalendar.deleteMany();
  await prisma.ratePlan.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.hotelApplication.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Database purged cleanly.\n');

  // --------------------------------------------------------------------------
  // 2. PASSWORD HASHES
  // --------------------------------------------------------------------------
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
  const managerPasswordHash = await bcrypt.hash('Manager123!', saltRounds);
  const staffPasswordHash = await bcrypt.hash('Staff123!', saltRounds);
  const guestPasswordHash = await bcrypt.hash('Guest123!', saltRounds);
  const commonPasswordHash = await bcrypt.hash('123456789', saltRounds); // For test/demo accounts

  // --------------------------------------------------------------------------
  // 3. CREATE USERS & ROLES
  // --------------------------------------------------------------------------
  console.log('--- 2. Creating Multi-Role User Credentials ---');

  // 3A. Platform Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hbms.com',
      password_hash: adminPasswordHash,
      role: Role.PLATFORM_ADMIN,
      first_name: 'Arthur',
      last_name: 'Pendelton',
      phone: '+91 98200 11000',
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`  ✓ Platform Admin: ${admin.email} (Admin123!)`);

  // 3B. Hotel Managers (Designated manager per hotel - strict 1:1)
  // Paris Manager: m1@mail.com (Primary Demo Manager)
  const managerParis = await prisma.user.create({
    data: {
      email: 'm1@mail.com',
      password_hash: commonPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Claire',
      last_name: 'Delacroix',
      phone: '+33 1 42 68 00 00',
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`  ✓ Paris Hotel Manager: ${managerParis.email} (123456789)`);

  const managerTokyo = await prisma.user.create({
    data: {
      email: 'manager.tokyo@sakura.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Kenji',
      last_name: 'Takahashi',
      phone: '+81 3 5555 0123',
      status: UserStatus.ACTIVE,
    },
  });

  const managerBali = await prisma.user.create({
    data: {
      email: 'manager.bali@azurehaven.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Wayan',
      last_name: 'Suryawan',
      phone: '+62 361 770000',
      status: UserStatus.ACTIVE,
    },
  });

  const managerNY = await prisma.user.create({
    data: {
      email: 'manager.ny@manhattan.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Michael',
      last_name: 'Sterling',
      phone: '+1 212 555 7800',
      status: UserStatus.ACTIVE,
    },
  });

  const managerDubai = await prisma.user.create({
    data: {
      email: 'manager.dubai@palace.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Tariq',
      last_name: 'Al-Mansoor',
      phone: '+971 4 301 7777',
      status: UserStatus.ACTIVE,
    },
  });

  const managerMandi = await prisma.user.create({
    data: {
      email: 'manager.mandi@hillparadise.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Rohit',
      last_name: 'Sharma',
      phone: '+91 98160 55555',
      status: UserStatus.ACTIVE,
    },
  });

  // 3C. Front Desk & Housekeeping Staff
  const receptionistParis = await prisma.user.create({
    data: {
      email: 'receptionist.paris@grandluxe.com',
      password_hash: staffPasswordHash,
      role: Role.RECEPTIONIST,
      first_name: 'Elin',
      last_name: 'Lund',
      phone: '+33 1 42 68 00 12',
      status: UserStatus.ACTIVE,
    },
  });

  const housekeepingParis = await prisma.user.create({
    data: {
      email: 'housekeeping.paris@grandluxe.com',
      password_hash: staffPasswordHash,
      role: Role.HOUSEKEEPING,
      first_name: 'Ana',
      last_name: 'Santos',
      phone: '+33 1 42 68 00 34',
      status: UserStatus.ACTIVE,
    },
  });

  // 3D. Demo Guests with Verified Stays
  const testGuest1 = await prisma.user.create({
    data: {
      email: 'test1@mail.com',
      password_hash: commonPasswordHash,
      role: Role.GUEST,
      first_name: 'Alex',
      last_name: 'Rivers',
      phone: '+1 555 0101',
      status: UserStatus.ACTIVE,
    },
  });

  const testGuest2 = await prisma.user.create({
    data: {
      email: 'test2@mail.com',
      password_hash: commonPasswordHash,
      role: Role.GUEST,
      first_name: 'Elena',
      last_name: 'Rostova',
      phone: '+1 555 0102',
      status: UserStatus.ACTIVE,
    },
  });

  const testGuest3 = await prisma.user.create({
    data: {
      email: 'test3@mail.com',
      password_hash: commonPasswordHash,
      role: Role.GUEST,
      first_name: 'Marcus',
      last_name: 'Vance',
      phone: '+1 555 0103',
      status: UserStatus.ACTIVE,
    },
  });

  const testGuest4 = await prisma.user.create({
    data: {
      email: 'test4@mail.com',
      password_hash: commonPasswordHash,
      role: Role.GUEST,
      first_name: 'Priya',
      last_name: 'Nair',
      phone: '+91 98200 0104',
      status: UserStatus.ACTIVE,
    },
  });

  const standardGuest = await prisma.user.create({
    data: {
      email: 'guest.sophia@example.com',
      password_hash: guestPasswordHash,
      role: Role.GUEST,
      first_name: 'Sophia',
      last_name: 'Martinez',
      phone: '+1 415 555 2671',
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✓ Created Platform Admin, 6 Managers, Receptionist, Housekeeper, and 5 Guests.\n');

  // --------------------------------------------------------------------------
  // 4. APPROVED HOTELS & APPLICATIONS
  // --------------------------------------------------------------------------
  console.log('--- 3. Creating Approved Hotels & Properties ---');

  // Helper for Application + Hotel
  async function createHotelWithApp(params: {
    managerId: string;
    name: string;
    slug: string;
    regNumber: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    category: HotelCategory;
    starRating: number;
    description: string;
    images: string[];
    currency?: string;
  }) {
    const app = await prisma.hotelApplication.create({
      data: {
        applicant_user_id: params.managerId,
        hotel_name: params.name,
        business_registration_number: params.regNumber,
        tax_id: params.taxId,
        contact_email: params.email,
        contact_phone: params.phone,
        address: params.address,
        city: params.city,
        state: params.state,
        country: params.country,
        postal_code: params.postalCode,
        latitude: params.latitude,
        longitude: params.longitude,
        category: params.category,
        check_in_time: '14:00',
        check_out_time: '11:00',
        description: params.description,
        status: ApplicationStatus.APPROVED,
        reviewed_by_id: admin.id,
        reviewed_at: new Date(),
        admin_notes: 'Fully vetted and approved for production launch.',
      },
    });

    const hotel = await prisma.hotel.create({
      data: {
        application_id: app.id,
        manager_id: params.managerId,
        name: params.name,
        slug: params.slug,
        description: params.description,
        category: params.category,
        star_rating: params.starRating,
        address: params.address,
        city: params.city,
        state: params.state,
        country: params.country,
        postal_code: params.postalCode,
        location: {
          type: 'Point',
          coordinates: [params.longitude, params.latitude],
        },
        latitude: params.latitude,
        longitude: params.longitude,
        phone: params.phone,
        email: params.email,
        images: params.images,
        status: HotelStatus.ACTIVE,
        currency: params.currency || 'INR',
        check_in_time: '14:00',
        check_out_time: '11:00',
        tax_rate_bps: 1200,
      },
    });

    return { app, hotel };
  }

  // 1. Le Grand Luxe Paris
  const { hotel: hotelParis } = await createHotelWithApp({
    managerId: managerParis.id,
    name: 'Le Grand Luxe Paris',
    slug: 'le-grand-luxe-paris',
    regNumber: 'FR-PARIS-2024-8841',
    taxId: 'FR8491028472',
    email: 'contact@grandluxe.com',
    phone: '+33 1 42 68 00 00',
    address: '15 Place Vendôme',
    city: 'Paris',
    state: 'Île-de-France',
    country: 'France',
    postalCode: '75001',
    latitude: 48.8606,
    longitude: 2.3376,
    category: HotelCategory.LUXURY,
    starRating: 5,
    description: 'An iconic 19th-century palace hotel overlooking Place Vendôme, combining neoclassical French grandeur with bespoke modern luxury, Michelin-starred gastronomy, and private garden salons.',
    images: [
      '/images/homepage/dest-misty-lake.webp',
      '/images/rooms/paris-royal-suite-1.webp',
      '/images/rooms/paris-tuileries-1.webp',
      '/images/rooms/paris-haussmann-1.webp',
    ],
  });

  // Attach Paris staff
  await prisma.staffProfile.create({
    data: {
      user_id: receptionistParis.id,
      hotel_id: hotelParis.id,
      role: Role.RECEPTIONIST,
      assigned_by_id: managerParis.id,
    },
  });
  await prisma.staffProfile.create({
    data: {
      user_id: housekeepingParis.id,
      hotel_id: hotelParis.id,
      role: Role.HOUSEKEEPING,
      assigned_by_id: managerParis.id,
    },
  });

  // 2. Sakura Boutique Hotel Tokyo
  const { hotel: hotelTokyo } = await createHotelWithApp({
    managerId: managerTokyo.id,
    name: 'Sakura Boutique Hotel Tokyo',
    slug: 'sakura-boutique-hotel-tokyo',
    regNumber: 'JP-TOKYO-2024-1102',
    taxId: 'JP1029384756',
    email: 'reservations@sakuraboutique.jp',
    phone: '+81 3 5555 0123',
    address: '6-10-1 Ginza, Chuo-ku',
    city: 'Tokyo',
    state: 'Tokyo',
    country: 'Japan',
    postalCode: '104-0061',
    latitude: 35.6762,
    longitude: 139.7650,
    category: HotelCategory.BOUTIQUE,
    starRating: 5,
    description: 'A serene urban sanctuary infused with minimalist Japanese aesthetics, Hinoki wood craftsmanship, curated tea ceremonies, and seamless high-tech hospitality in the heart of Ginza.',
    images: [
      '/images/homepage/dest-foggy-valley.webp',
      '/images/rooms/tokyo-hinoki-penthouse-1.webp',
      '/images/rooms/tokyo-tatami-suite-1.webp',
      '/images/rooms/tokyo-ginza-studio-1.webp',
    ],
  });

  // 3. Azure Haven Resort Bali
  const { hotel: hotelBali } = await createHotelWithApp({
    managerId: managerBali.id,
    name: 'Azure Haven Resort',
    slug: 'azure-haven-resort',
    regNumber: 'ID-BALI-2024-5542',
    taxId: 'ID9988776655',
    email: 'stay@azurehavenbali.com',
    phone: '+62 361 770000',
    address: 'Jl. Raya Nusa Dua Selatan No. 88',
    city: 'Bali',
    state: 'Bali',
    country: 'Indonesia',
    postalCode: '80363',
    latitude: -8.7956,
    longitude: 115.2285,
    category: HotelCategory.RESORT,
    starRating: 5,
    description: 'Perched upon the dramatic limestone cliffs of Nusa Dua, offering panoramic Indian Ocean views, private infinity plunge pools, lush frangipani gardens, and holistic wellness pavilions.',
    images: [
      '/images/homepage/dest-tropical-coast.webp',
      '/images/rooms/bali-cliff-villa-1.webp',
      '/images/rooms/bali-sunset-pool-1.webp',
      '/images/rooms/bali-garden-sanctuary-1.webp',
    ],
  });

  // 4. The Manhattan Executive Suites New York
  const { hotel: hotelNY } = await createHotelWithApp({
    managerId: managerNY.id,
    name: 'The Manhattan Executive Suites',
    slug: 'the-manhattan-executive-suites',
    regNumber: 'US-NY-2024-7721',
    taxId: 'US139876543',
    email: 'concierge@manhattansuites.com',
    phone: '+1 212 555 7800',
    address: '1095 Avenue of the Americas',
    city: 'New York',
    state: 'New York',
    country: 'United States',
    postalCode: '10036',
    latitude: 40.7580,
    longitude: -73.9855,
    category: HotelCategory.BUSINESS,
    starRating: 4,
    description: 'Soaring high above Bryant Park in Midtown Manhattan, offering refined residential suites with full kitchenettes, ergonomic executive workspaces, and skyline vistas.',
    images: [
      '/images/homepage/hotel-modern-facade.webp',
      '/images/rooms/ny-empire-suite-1.webp',
      '/images/rooms/ny-premier-studio-1.webp',
      '/images/rooms/ny-hudson-loft-1.webp',
    ],
  });

  // 5. Emirates Mirage Palace Dubai
  const { hotel: hotelDubai } = await createHotelWithApp({
    managerId: managerDubai.id,
    name: 'Emirates Mirage Palace',
    slug: 'emirates-mirage-palace',
    regNumber: 'AE-DUBAI-2024-9912',
    taxId: 'AE1002938475',
    email: 'vip@miragedubai.ae',
    phone: '+971 4 301 7777',
    address: 'Crescent Road, The Palm Jumeirah',
    city: 'Dubai',
    state: 'Dubai',
    country: 'United Arab Emirates',
    postalCode: '00000',
    latitude: 25.1124,
    longitude: 55.1389,
    category: HotelCategory.LUXURY,
    starRating: 5,
    description: 'A palatial oasis on the outer crescent of Palm Jumeirah, featuring private white-sand beach access, gold-appointed suites, personal butler service, and Michelin dining.',
    images: [
      '/images/homepage/dest-sunset-ridge.webp',
      '/images/rooms/dubai-royal-penthouse-1.webp',
      '/images/rooms/dubai-beach-villa-1.webp',
      '/images/rooms/dubai-marina-suite-1.webp',
    ],
  });

  // 6. Hill Paradise Mandi
  const { hotel: hotelMandi } = await createHotelWithApp({
    managerId: managerMandi.id,
    name: 'Hill Paradise',
    slug: 'hill-paradise',
    regNumber: 'IN-HP-2024-3312',
    taxId: '02AABCH1234F1Z5',
    email: 'info@hillparadise.in',
    phone: '+91 98160 55555',
    address: 'Village Kataula, Near Pandoh Dam',
    city: 'Mandi',
    state: 'Himachal Pradesh',
    country: 'India',
    postalCode: '175001',
    latitude: 31.7087,
    longitude: 76.9320,
    category: HotelCategory.LUXURY,
    starRating: 5,
    description: 'Nestled amidst breathtaking Himalayan landscapes, offering an exclusive blend of natural beauty, refined comfort, pine forest tranquility, and authentic mountain hospitality.',
    images: [
      '/images/homepage/dest-foggy-valley.webp',
      '/images/rooms/tokyo-tatami-suite-1.webp',
      '/images/rooms/bali-garden-sanctuary-1.webp',
    ],
  });

  console.log('✓ Created 6 Approved Hotels: Paris, Tokyo, Bali, New York, Dubai, Mandi.\n');

  // --------------------------------------------------------------------------
  // 5. ROOM TYPES, PHYSICAL ROOMS & RATE PLANS
  // --------------------------------------------------------------------------
  console.log('--- 4. Seeding Room Types, Physical Rooms & Rates ---');

  interface RoomTypeSpec {
    name: string;
    slug: string;
    description: string;
    maxGuests: number;
    maxAdults: number;
    maxChildren: number;
    bedType: string;
    roomSizeSqm: number;
    amenities: string[];
    images: string[];
    basePriceINR: number;
    roomNumbers: string[];
  }

  async function seedHotelRooms(hotelId: string, specs: RoomTypeSpec[]) {
    const created = [];
    for (const spec of specs) {
      const roomType = await prisma.roomType.create({
        data: {
          hotel_id: hotelId,
          name: spec.name,
          slug: spec.slug,
          description: spec.description,
          max_guests: spec.maxGuests,
          max_adults: spec.maxAdults,
          max_children: spec.maxChildren,
          bed_type: spec.bedType,
          room_size_sqm: spec.roomSizeSqm,
          amenities: spec.amenities,
          images: spec.images,
          is_active: true,
        },
      });

      // Create Physical Rooms
      for (const num of spec.roomNumbers) {
        await prisma.room.create({
          data: {
            hotel_id: hotelId,
            room_type_id: roomType.id,
            room_number: num,
            floor: Math.floor(parseInt(num, 10) / 100) || 1,
            operational_status: OperationalStatus.READY,
          },
        });
      }

      // Default Flexible Rate Plan
      const basePriceCents = spec.basePriceINR * 100;
      await prisma.ratePlan.create({
        data: {
          room_type_id: roomType.id,
          name: 'Lowest Regular Rate — Free Cancellation',
          description: 'Best flexible rate with complimentary cancellation up to 48 hours prior to arrival.',
          base_price_cents: basePriceCents,
          cancellation_policy: CancellationPolicy.FREE_CANCELLATION,
          cancellation_deadline_hours: 48,
          is_default: true,
        },
      });

      // Breakfast & Spa Package
      await prisma.ratePlan.create({
        data: {
          room_type_id: roomType.id,
          name: 'Breakfast & Spa Package',
          description: 'Includes artisanal daily breakfast buffet, signature welcome drinks, and spa access.',
          base_price_cents: Math.round(basePriceCents * 1.18),
          cancellation_policy: CancellationPolicy.FREE_CANCELLATION,
          cancellation_deadline_hours: 24,
          is_default: false,
        },
      });

      created.push(roomType);
    }
    return created;
  }

  // Paris Rooms
  const parisRooms = await seedHotelRooms(hotelParis.id, [
    {
      name: 'Royal Palais Suite',
      slug: 'royal-palais-suite',
      description: 'Opulent master suite with grand king bed, hand-carved moldings, private marble soaking bath, separate salon, and panoramic balcony vistas of the Louvre.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 85.0,
      amenities: ['Private Balcony', 'Marble Soaking Tub', 'Espresso Bar', 'High-Speed Wi-Fi', '24h Butler Service', 'Air Conditioning', 'Mini Refrigerator', 'Lounge Chairs'],
      images: [
        '/images/rooms/paris-royal-suite-1.webp',
        '/images/rooms/paris-royal-suite-2.webp',
        '/images/rooms/paris-royal-suite-3.webp',
      ],
      basePriceINR: 58000,
      roomNumbers: ['201', '202', '203'],
    },
    {
      name: 'Deluxe Tuileries Room',
      slug: 'deluxe-tuileries-room',
      description: 'Sunlit Parisian haven boasting soaring ceilings, custom velvet bedding, walk-in rain shower, and tranquil garden vistas.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 50.0,
      amenities: ['Garden View', 'Rain Shower', 'Espresso Machine', 'High-Speed Wi-Fi', 'Air Conditioning', 'Mini Refrigerator'],
      images: [
        '/images/rooms/paris-tuileries-1.webp',
        '/images/rooms/paris-tuileries-2.webp',
        '/images/rooms/paris-tuileries-3.webp',
      ],
      basePriceINR: 32000,
      roomNumbers: ['101', '102', '103'],
    },
    {
      name: 'Classic Haussmann Chamber',
      slug: 'classic-haussmann-chamber',
      description: 'Refined Parisian chamber preserving authentic 19th-century chevron oak parquetry, marble fireplace, and bespoke modern furnishings.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 38.0,
      amenities: ['Heritage Fireplace', 'Rain Shower', 'High-Speed Wi-Fi', 'Air Conditioning', 'Mini Refrigerator'],
      images: [
        '/images/rooms/paris-haussmann-1.webp',
        '/images/rooms/paris-haussmann-2.webp',
        '/images/rooms/paris-haussmann-3.webp',
      ],
      basePriceINR: 24000,
      roomNumbers: ['301', '302', '303'],
    },
  ]);

  // Tokyo Rooms
  const tokyoRooms = await seedHotelRooms(hotelTokyo.id, [
    {
      name: 'Hinoki Executive Penthouse',
      slug: 'hinoki-executive-penthouse',
      description: 'Bespoke top-floor penthouse with aromatic Hinoki cedar soaking bath, floor-to-ceiling Ginza skyline views, and curated Japanese tea ceremony salon.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 90.0,
      amenities: ['Hinoki Wood Tub', 'Skyline Panorama', 'Private Tea Room', 'High-Speed Wi-Fi', 'Air Conditioning'],
      images: [
        '/images/rooms/tokyo-hinoki-penthouse-1.webp',
        '/images/rooms/tokyo-hinoki-penthouse-2.webp',
        '/images/rooms/tokyo-hinoki-penthouse-3.webp',
      ],
      basePriceINR: 48000,
      roomNumbers: ['801', '802', '803'],
    },
    {
      name: 'Deluxe Tatami Suite',
      slug: 'deluxe-tatami-suite',
      description: 'Harmonious blend of traditional Igusa tatami matting, plush organic futon bedding, Shoji paper screens, and zen indoor rock garden.',
      maxGuests: 3,
      maxAdults: 3,
      maxChildren: 1,
      bedType: '2 Japanese Futons',
      roomSizeSqm: 55.0,
      amenities: ['Zen Rock Garden', 'Deep Soaking Tub', 'Yukata Robes', 'High-Speed Wi-Fi', 'Tea Station'],
      images: [
        '/images/rooms/tokyo-tatami-suite-1.webp',
        '/images/rooms/tokyo-tatami-suite-2.webp',
        '/images/rooms/tokyo-tatami-suite-3.webp',
      ],
      basePriceINR: 28000,
      roomNumbers: ['501', '502', '503'],
    },
    {
      name: 'Modern Ginza Studio',
      slug: 'modern-ginza-studio',
      description: 'Ultra-modern urban studio engineered with acoustic dampening, smart ambient illumination, and bespoke designer ergonomic workstation.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 40.0,
      amenities: ['City View', 'Smart Lighting', 'Rain Shower', 'High-Speed Wi-Fi', 'Mini Refrigerator'],
      images: [
        '/images/rooms/tokyo-ginza-studio-1.webp',
        '/images/rooms/tokyo-ginza-studio-2.webp',
        '/images/rooms/tokyo-ginza-studio-3.webp',
      ],
      basePriceINR: 19500,
      roomNumbers: ['301', '302', '303'],
    },
  ]);

  // Bali Rooms
  const baliRooms = await seedHotelRooms(hotelBali.id, [
    {
      name: 'Oceanfront Cliffside Villa',
      slug: 'oceanfront-cliffside-villa',
      description: 'Spacious ocean-view suites thoughtfully designed with floor-to-ceiling windows, private terraces, infinity plunge pool, and panoramic Indian Ocean vistas.',
      maxGuests: 4,
      maxAdults: 2,
      maxChildren: 2,
      bedType: '1 King Bed, 2 Daybeds',
      roomSizeSqm: 120.0,
      amenities: ['Private Ocean Terrace', 'Plunge Pool', 'Outdoor Stone Tub', 'High-Speed Wi-Fi', 'Air Conditioner', 'Mini Refrigerator'],
      images: [
        '/images/rooms/bali-cliff-villa-1.webp',
        '/images/rooms/bali-cliff-villa-2.webp',
        '/images/rooms/bali-cliff-villa-3.webp',
      ],
      basePriceINR: 42000,
      roomNumbers: ['101', '102', '103', '104'],
    },
    {
      name: 'Sunset Plunge Pool Villa',
      slug: 'sunset-plunge-pool-villa',
      description: 'Perched on the southern cliffside of Nusa Dua, featuring a private infinity plunge pool, outdoor marble shower, and unobstructed sunset panoramas.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 95.0,
      amenities: ['Private Plunge Pool', 'Sunset Ocean View', 'Outdoor Stone Tub', 'High-Speed Wi-Fi', 'Air Conditioner'],
      images: [
        '/images/rooms/bali-sunset-pool-1.webp',
        '/images/rooms/bali-sunset-pool-2.webp',
        '/images/rooms/bali-sunset-pool-3.webp',
      ],
      basePriceINR: 35000,
      roomNumbers: ['201', '202', '203'],
    },
    {
      name: 'Tropical Garden Sanctuary',
      slug: 'tropical-garden-sanctuary',
      description: 'Enclosed within fragrant frangipani gardens, this tranquil Balinese pavilion offers an open-air bathroom with stone tub, sheltered daybed, and private courtyard.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 75.0,
      amenities: ['Private Courtyard', 'Open-Air Stone Bath', 'Tropical Garden View', 'High-Speed Wi-Fi', 'Air Conditioner'],
      images: [
        '/images/rooms/bali-garden-sanctuary-1.webp',
        '/images/rooms/bali-garden-sanctuary-2.webp',
        '/images/rooms/bali-garden-sanctuary-3.webp',
      ],
      basePriceINR: 22000,
      roomNumbers: ['301', '302', '303'],
    },
  ]);

  // New York Rooms
  const nyRooms = await seedHotelRooms(hotelNY.id, [
    {
      name: 'Empire Skyline Suite',
      slug: 'empire-skyline-suite',
      description: 'High-floor executive corner suite featuring wraparound skyline views of Midtown Manhattan, king master bedroom, marble bath, and private conference salon.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 80.0,
      amenities: ['Manhattan Skyline View', 'Executive Desk', 'Marble Bath', 'High-Speed Wi-Fi', 'Air Conditioning'],
      images: [
        '/images/rooms/ny-empire-suite-1.webp',
        '/images/rooms/ny-empire-suite-2.webp',
        '/images/rooms/ny-empire-suite-3.webp',
      ],
      basePriceINR: 45000,
      roomNumbers: ['3401', '3402', '3403'],
    },
    {
      name: 'Premier Times Square Studio',
      slug: 'premier-times-square-studio',
      description: 'Acoustically isolated sanctuary with floor-to-ceiling city views, plush king bedding, ergonomic workstation, and glass rain shower.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 45.0,
      amenities: ['Soundproof Windows', 'Rain Shower', 'High-Speed Wi-Fi', 'Air Conditioning', 'Coffee Bar'],
      images: [
        '/images/rooms/ny-premier-studio-1.webp',
        '/images/rooms/ny-premier-studio-2.webp',
        '/images/rooms/ny-premier-studio-3.webp',
      ],
      basePriceINR: 26000,
      roomNumbers: ['2201', '2202', '2203'],
    },
    {
      name: 'Hudson Corner Loft',
      slug: 'hudson-corner-loft',
      description: 'Loft-inspired layout with exposed architectural accents, designer kitchenette, plush queen bed, and skyline sunset views towards the Hudson River.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 40.0,
      amenities: ['Hudson River View', 'Kitchenette', 'High-Speed Wi-Speed', 'Air Conditioning'],
      images: [
        '/images/rooms/ny-hudson-loft-1.webp',
        '/images/rooms/ny-hudson-loft-2.webp',
        '/images/rooms/ny-hudson-loft-3.webp',
      ],
      basePriceINR: 18500,
      roomNumbers: ['1501', '1502', '1503'],
    },
  ]);

  // Dubai Rooms
  const dubaiRooms = await seedHotelRooms(hotelDubai.id, [
    {
      name: 'Royal Palm Penthouse',
      slug: 'royal-palm-penthouse',
      description: 'Palatial penthouse residence on Palm Jumeirah with private rooftop infinity pool, master bedroom with 24k gold bath fixtures, and personal butler service.',
      maxGuests: 4,
      maxAdults: 2,
      maxChildren: 2,
      bedType: '1 King Bed, 1 Daybed',
      roomSizeSqm: 160.0,
      amenities: ['Private Infinity Pool', 'Gold Fixture Jacuzzi', 'Butler Service', 'Palm Jumeirah Panorama', 'High-Speed Wi-Fi'],
      images: [
        '/images/rooms/dubai-royal-penthouse-1.webp',
        '/images/rooms/dubai-royal-penthouse-2.webp',
        '/images/rooms/dubai-royal-penthouse-3.webp',
      ],
      basePriceINR: 95000,
      roomNumbers: ['5001', '5002', '5003'],
    },
    {
      name: 'Imperial Beach Villa',
      slug: 'imperial-beach-villa',
      description: 'Step directly from your private terrace onto the pristine sands of the Arabian Gulf. Includes private beach cabana and open-air rain shower.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 110.0,
      amenities: ['Direct Beach Access', 'Private Shaded Cabana', 'Outdoor Rain Shower', 'High-Speed Wi-Fi'],
      images: [
        '/images/rooms/dubai-beach-villa-1.webp',
        '/images/rooms/dubai-beach-villa-2.webp',
        '/images/rooms/dubai-beach-villa-3.webp',
      ],
      basePriceINR: 65000,
      roomNumbers: ['101', '102', '103'],
    },
    {
      name: 'Executive Marina Suite',
      slug: 'executive-marina-suite',
      description: 'Opulent suite featuring uninterrupted vistas of luxury mega-yachts in Dubai Marina, custom Italian marble bath, and private cinema lounge.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 70.0,
      amenities: ['Marina Harbor View', 'Italian Marble Bath', 'High-Speed Wi-Fi', 'Air Conditioning', 'Espresso Bar'],
      images: [
        '/images/rooms/dubai-marina-suite-1.webp',
        '/images/rooms/dubai-marina-suite-2.webp',
        '/images/rooms/dubai-marina-suite-3.webp',
      ],
      basePriceINR: 38000,
      roomNumbers: ['2001', '2002', '2003'],
    },
  ]);

  // Mandi (Hill Paradise) Rooms
  const mandiRooms = await seedHotelRooms(hotelMandi.id, [
    {
      name: 'Himalayan Mountain Suite',
      slug: 'himalayan-mountain-suite',
      description: 'Panoramic mountain view suite overlooking pine forests with private balcony, cedarwood interior accents, and handcrafted fire hearth.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 65.0,
      amenities: ['Himalayan Panorama', 'Wood Fireplace', 'Private Balcony', 'High-Speed Wi-Fi', 'Heated Flooring'],
      images: [
        '/images/homepage/dest-foggy-valley.webp',
        '/images/rooms/tokyo-tatami-suite-1.webp',
        '/images/rooms/bali-garden-sanctuary-1.webp',
      ],
      basePriceINR: 22000,
      roomNumbers: ['101', '102', '103'],
    },
    {
      name: 'Deodar Forest Chalet',
      slug: 'deodar-forest-chalet',
      description: 'Tranquil alpine chalet sheltered within fragrant deodar groves, featuring hand-crafted pine furnishings, heated bathroom, and private valley deck.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 48.0,
      amenities: ['Forest Deck', 'Rain Shower', 'High-Speed Wi-Fi', 'Electric Blanket', 'Tea Station'],
      images: [
        '/images/rooms/tokyo-tatami-suite-2.webp',
        '/images/rooms/bali-garden-sanctuary-2.webp',
      ],
      basePriceINR: 16500,
      roomNumbers: ['201', '202', '203'],
    },
  ]);

  console.log('✓ Seeded 6 Approved Hotels, 17 Room Types with Collages, and 55 Physical Rooms.\n');

  // --------------------------------------------------------------------------
  // 6. COMPLETED STAYS, PAYMENTS & VERIFIED REVIEWS
  // --------------------------------------------------------------------------
  console.log('--- 5. Seeding Completed Stays & Verified Reviews ---');

  // Booking on Monday Nov 09 (Cash Inflow), Check-in on Tuesday Nov 10 (Stay Revenue)
  const bookedDate = new Date('2026-11-09T14:30:00.000Z');
  const checkInDate = new Date('2026-11-10T14:00:00.000Z');
  const checkOutDate = new Date('2026-11-11T11:00:00.000Z');

  interface CompletedStaySpec {
    code: string;
    hotelId: string;
    guestId: string;
    guestName: string;
    guestEmail: string;
    roomType: any;
    roomNumber: string;
    rating: number;
    reviewTitle: string;
    reviewComment: string;
  }

  const completedStays: CompletedStaySpec[] = [
    {
      code: 'RES-REV-PARIS-101',
      hotelId: hotelParis.id,
      guestId: testGuest2.id,
      guestName: 'Elena Rostova',
      guestEmail: testGuest2.email,
      roomType: parisRooms[0], // Royal Palais Suite
      roomNumber: '201',
      rating: 5,
      reviewTitle: 'Opulence and Unrivaled Parisian Splendor',
      reviewComment: 'The Royal Palais Suite was breathtaking. Hand-carved moldings, a marble soaking bath with private salon, and panoramic balcony vistas of the Louvre made our stay completely unforgettable. Staff hospitality was world-class.',
    },
    {
      code: 'RES-REV-TOKYO-101',
      hotelId: hotelTokyo.id,
      guestId: testGuest1.id,
      guestName: 'Alex Rivers',
      guestEmail: testGuest1.email,
      roomType: tokyoRooms[2], // Modern Ginza Studio
      roomNumber: '301',
      rating: 5,
      reviewTitle: 'Masterpiece in Minimalist Luxury',
      reviewComment: 'Acoustic dampening provided complete silence right in the vibrant core of Ginza. The Hinoki woodwork aromas and morning tea service were unforgettable.',
    },
    {
      code: 'RES-REV-BALI-101',
      hotelId: hotelBali.id,
      guestId: testGuest3.id,
      guestName: 'Marcus Vance',
      guestEmail: testGuest3.email,
      roomType: baliRooms[0], // Oceanfront Cliffside Villa
      roomNumber: '101',
      rating: 5,
      reviewTitle: 'Breathtaking Cliffside Ocean Views',
      reviewComment: 'Private plunge pool blending seamlessly into the Indian Ocean horizon. Unparalleled tranquility and authentic Balinese hospitality.',
    },
    {
      code: 'RES-REV-MANDI-101',
      hotelId: hotelMandi.id,
      guestId: testGuest4.id,
      guestName: 'Priya Nair',
      guestEmail: testGuest4.email,
      roomType: mandiRooms[0], // Himalayan Mountain Suite
      roomNumber: '101',
      rating: 5,
      reviewTitle: 'Serene Himalayan Retreat',
      reviewComment: 'Waking up to misty pine valleys and Himalayan mountain peaks from our private balcony was magical. The wood fireplace and warm Himachali hospitality made this stay extraordinary.',
    },
  ];

  for (const s of completedStays) {
    const ratePlan = await prisma.ratePlan.findFirst({
      where: { room_type_id: s.roomType.id, is_default: true },
    });
    const physicalRoom = await prisma.room.findFirst({
      where: { hotel_id: s.hotelId, room_number: s.roomNumber },
    });

    const nightlyRateCents = ratePlan ? ratePlan.base_price_cents : 4000000;
    const subtotalCents = nightlyRateCents;
    const taxCents = Math.round(subtotalCents * 0.12);
    const totalCents = subtotalCents + taxCents;

    // A. Reservation
    const res = await prisma.reservation.create({
      data: {
        reservation_code: s.code,
        hotel_id: s.hotelId,
        guest_user_id: s.guestId,
        guest_name: s.guestName,
        guest_email: s.guestEmail,
        guest_phone: '+91 98200 99999',
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_rooms_count: 1,
        status: ReservationStatus.CHECKED_OUT,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        fees_cents: 0,
        total_cents: totalCents,
        currency: 'INR',
        is_walk_in: false,
        created_at: bookedDate,
      },
    });

    // B. ReservationRoom line
    const resRoom = await prisma.reservationRoom.create({
      data: {
        reservation_id: res.id,
        room_type_id: s.roomType.id,
        rate_plan_id: ratePlan!.id,
        quantity: 1,
        nightly_rate_cents: nightlyRateCents,
        total_price_cents: totalCents,
        nightly_breakdown: [
          {
            date: '2026-11-10',
            rate_cents: nightlyRateCents,
            is_override: false,
          },
        ],
      },
    });

    // C. Room Assignment
    if (physicalRoom) {
      await prisma.roomAssignment.create({
        data: {
          reservation_id: res.id,
          reservation_room_id: resRoom.id,
          slot_index: 0,
          room_id: physicalRoom.id,
          assigned_at: checkInDate,
          status: AssignmentStatus.RELEASED,
          released_at: checkOutDate,
          release_reason: 'Normal Guest Checkout Completed',
        },
      });
    }

    // D. Payment on Monday
    await prisma.payment.create({
      data: {
        reservation_id: res.id,
        idempotency_key: `IDEMP-${s.code}`,
        transaction_reference: `TXN-${s.code}`,
        payment_provider: 'MOCK_PROVIDER',
        payment_method: 'MOCK_CARD',
        amount_cents: totalCents,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        created_at: bookedDate,
      },
    });

    // E. Verified Review bound 1:1 to Reservation
    await prisma.review.create({
      data: {
        hotel_id: s.hotelId,
        reservation_id: res.id,
        room_type_id: s.roomType.id,
        user_id: s.guestId,
        rating: s.rating,
        title: s.reviewTitle,
        comment: s.reviewComment,
        stay_date: 'November 2026',
        is_verified: true,
        created_at: new Date('2026-11-11T12:00:00.000Z'),
      },
    });

    console.log(`  ✓ Seeded Completed Stay & Review: ${s.code} -> ${s.roomType.name} (Guest: ${s.guestEmail})`);
  }

  // --------------------------------------------------------------------------
  // 7. INITIALIZE MONGODB ATLAS CUSTOM & 2DSPHERE INDEXES
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Reconciling MongoDB Atlas Custom & 2dsphere Indexes ---');
  await initializeMongoIndexes();

  console.log('========================================================================');
  console.log('🎉 Single Authoritative Database Seed Completed Successfully!');
  console.log('========================================================================\n');
}

main()
  .catch((e) => {
    console.error('Database seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
