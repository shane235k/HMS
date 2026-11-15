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
  console.log('✓ Database purged cleanly. All collections cleared.\n');

  // --------------------------------------------------------------------------
  // 2. PASSWORD HASHES
  // --------------------------------------------------------------------------
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
  const managerPasswordHash = await bcrypt.hash('Manager123!', saltRounds);
  const staffPasswordHash = await bcrypt.hash('Staff123!', saltRounds);
  const commonPasswordHash = await bcrypt.hash('123456789', saltRounds);

  // --------------------------------------------------------------------------
  // 3. CREATE USERS & ROLES
  // --------------------------------------------------------------------------
  console.log('--- 2. Creating Hotel Roles & Staff Credentials ---');

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
  console.log(`  ✓ Platform Admin: ${admin.email} (Password: Admin123!)`);

  // 3B. Hotel Managers
  const managerParis = await prisma.user.create({
    data: {
      email: 'manager.paris@grandluxe.com',
      password_hash: managerPasswordHash,
      role: Role.HOTEL_MANAGER,
      first_name: 'Claire',
      last_name: 'Delacroix',
      phone: '+33 1 42 68 00 00',
      status: UserStatus.ACTIVE,
    },
  });

  const managerParisDemo = await prisma.user.create({
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

  // 3C. Front Desk Receptionists (Every Hotel)
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

  const receptionistTokyo = await prisma.user.create({
    data: {
      email: 'receptionist.tokyo@sakura.com',
      password_hash: staffPasswordHash,
      role: Role.RECEPTIONIST,
      first_name: 'Yuki',
      last_name: 'Tanaka',
      phone: '+81 3 5555 0124',
      status: UserStatus.ACTIVE,
    },
  });

  const receptionistBali = await prisma.user.create({
    data: {
      email: 'receptionist.bali@azurehaven.com',
      password_hash: staffPasswordHash,
      role: Role.RECEPTIONIST,
      first_name: 'Ketut',
      last_name: 'Aris',
      phone: '+62 361 770001',
      status: UserStatus.ACTIVE,
    },
  });

  const receptionistNY = await prisma.user.create({
    data: {
      email: 'receptionist.ny@manhattan.com',
      password_hash: staffPasswordHash,
      role: Role.RECEPTIONIST,
      first_name: 'Sarah',
      last_name: 'Jenkins',
      phone: '+1 212 555 7801',
      status: UserStatus.ACTIVE,
    },
  });

  const receptionistDubai = await prisma.user.create({
    data: {
      email: 'receptionist.dubai@palace.com',
      password_hash: staffPasswordHash,
      role: Role.RECEPTIONIST,
      first_name: 'Fatima',
      last_name: 'Al-Sayed',
      phone: '+971 4 301 7778',
      status: UserStatus.ACTIVE,
    },
  });

  // 3D. Housekeeping Staff (Every Hotel)
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

  const housekeepingTokyo = await prisma.user.create({
    data: {
      email: 'housekeeping.tokyo@sakura.com',
      password_hash: staffPasswordHash,
      role: Role.HOUSEKEEPING,
      first_name: 'Hana',
      last_name: 'Sato',
      phone: '+81 3 5555 0125',
      status: UserStatus.ACTIVE,
    },
  });

  const housekeepingBali = await prisma.user.create({
    data: {
      email: 'housekeeping.bali@azurehaven.com',
      password_hash: staffPasswordHash,
      role: Role.HOUSEKEEPING,
      first_name: 'Made',
      last_name: 'Dewi',
      phone: '+62 361 770002',
      status: UserStatus.ACTIVE,
    },
  });

  const housekeepingNY = await prisma.user.create({
    data: {
      email: 'housekeeping.ny@manhattan.com',
      password_hash: staffPasswordHash,
      role: Role.HOUSEKEEPING,
      first_name: 'David',
      last_name: 'Miller',
      phone: '+1 212 555 7802',
      status: UserStatus.ACTIVE,
    },
  });

  const housekeepingDubai = await prisma.user.create({
    data: {
      email: 'housekeeping.dubai@palace.com',
      password_hash: staffPasswordHash,
      role: Role.HOUSEKEEPING,
      first_name: 'Rashid',
      last_name: 'Khan',
      phone: '+971 4 301 7779',
      status: UserStatus.ACTIVE,
    },
  });

  // 3E. THE SOLE TEST GUEST ACCOUNT: test1@mail.com named TEST ONE
  const testGuest1 = await prisma.user.create({
    data: {
      email: 'test1@mail.com',
      password_hash: commonPasswordHash,
      role: Role.GUEST,
      first_name: 'TEST',
      last_name: 'ONE',
      phone: '+91 98200 00001',
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`  ✓ Sole Guest: ${testGuest1.email} (Name: TEST ONE, Password: 123456789)\n`);

  // --------------------------------------------------------------------------
  // 4. APPROVED HOTELS & APPLICATIONS
  // --------------------------------------------------------------------------
  console.log('--- 3. Creating Approved Hotels & Applications ---');

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
    latitude: 48.8675,
    longitude: 2.3294,
    category: HotelCategory.LUXURY,
    starRating: 5,
    description: 'An iconic palace hotel on prestigious Place Vendôme, featuring opulent Haussmann-era interiors, crystal chandeliers, a two-Michelin-starred restaurant, and bespoke butler service.',
    images: [
      '/images/rooms/paris-royal-suite-1.webp',
      '/images/rooms/paris-tuileries-1.webp',
      '/images/rooms/paris-haussmann-1.webp',
    ],
  });

  // Attach Paris staff
  await prisma.staffProfile.create({
    data: {
      user_id: managerParisDemo.id,
      hotel_id: hotelParis.id,
      role: Role.HOTEL_MANAGER,
      assigned_by_id: managerParis.id,
    },
  });
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
      '/images/rooms/tokyo-hinoki-penthouse-1.webp',
      '/images/rooms/tokyo-tatami-suite-1.webp',
      '/images/rooms/tokyo-ginza-studio-1.webp',
    ],
  });

  await prisma.staffProfile.create({
    data: {
      user_id: receptionistTokyo.id,
      hotel_id: hotelTokyo.id,
      role: Role.RECEPTIONIST,
      assigned_by_id: managerTokyo.id,
    },
  });
  await prisma.staffProfile.create({
    data: {
      user_id: housekeepingTokyo.id,
      hotel_id: hotelTokyo.id,
      role: Role.HOUSEKEEPING,
      assigned_by_id: managerTokyo.id,
    },
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
      '/images/rooms/bali-cliff-villa-1.webp',
      '/images/rooms/bali-sunset-pool-1.webp',
      '/images/rooms/bali-garden-sanctuary-1.webp',
    ],
  });

  await prisma.staffProfile.create({
    data: {
      user_id: receptionistBali.id,
      hotel_id: hotelBali.id,
      role: Role.RECEPTIONIST,
      assigned_by_id: managerBali.id,
    },
  });
  await prisma.staffProfile.create({
    data: {
      user_id: housekeepingBali.id,
      hotel_id: hotelBali.id,
      role: Role.HOUSEKEEPING,
      assigned_by_id: managerBali.id,
    },
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
      '/images/rooms/ny-empire-suite-1.webp',
      '/images/rooms/ny-premier-studio-1.webp',
      '/images/rooms/ny-hudson-loft-1.webp',
    ],
  });

  await prisma.staffProfile.create({
    data: {
      user_id: receptionistNY.id,
      hotel_id: hotelNY.id,
      role: Role.RECEPTIONIST,
      assigned_by_id: managerNY.id,
    },
  });
  await prisma.staffProfile.create({
    data: {
      user_id: housekeepingNY.id,
      hotel_id: hotelNY.id,
      role: Role.HOUSEKEEPING,
      assigned_by_id: managerNY.id,
    },
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
      '/images/rooms/dubai-royal-penthouse-1.webp',
      '/images/rooms/dubai-beach-villa-1.webp',
      '/images/rooms/dubai-marina-suite-1.webp',
    ],
  });

  await prisma.staffProfile.create({
    data: {
      user_id: receptionistDubai.id,
      hotel_id: hotelDubai.id,
      role: Role.RECEPTIONIST,
      assigned_by_id: managerDubai.id,
    },
  });
  await prisma.staffProfile.create({
    data: {
      user_id: housekeepingDubai.id,
      hotel_id: hotelDubai.id,
      role: Role.HOUSEKEEPING,
      assigned_by_id: managerDubai.id,
    },
  });

  console.log('✓ Created 5 Approved Hotels: Paris, Tokyo, Bali, New York, Dubai.\n');

  // --------------------------------------------------------------------------
  // 5. ROOM TYPES, PHYSICAL ROOMS & RATE PLANS
  // --------------------------------------------------------------------------
  console.log('--- 4. Seeding Room Types, Physical Rooms & Rates ---');

  interface RoomTypeSpec {
    name: string;
    slug: string;
    description: string;
    rateDescription?: string;
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

      // Default Standard Flexible Rate Plan
      await prisma.ratePlan.create({
        data: {
          room_type_id: roomType.id,
          name: 'Best Available Flexible Rate',
          description:
            spec.rateDescription ||
            'Standard flexible rate with free cancellation up to 48 hours before check-in. Includes high-speed Wi-Fi and full access to wellness pavilions.',
          cancellation_policy: CancellationPolicy.FREE_CANCELLATION,
          cancellation_deadline_hours: 48,
          base_price_cents: Math.round(spec.basePriceINR * 100),
          is_default: true,
          is_active: true,
        },
      });

      // Physical Rooms
      for (const num of spec.roomNumbers) {
        const floor = parseInt(num[0], 10) || 1;
        await prisma.room.create({
          data: {
            hotel_id: hotelId,
            room_type_id: roomType.id,
            room_number: num,
            floor,
            operational_status: OperationalStatus.READY,
            is_active: true,
          },
        });
      }

      created.push(roomType);
    }
    return created;
  }

  // Paris Rooms
  const parisRooms = await seedHotelRooms(hotelParis.id, [
    {
      name: 'Royal Palais Suite',
      slug: 'royal-palais-suite',
      description: 'Opulent master suite with hand-carved moldings, a marble soaking tub, private salon, and panoramic balcony views of the Louvre.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 85.0,
      amenities: ['Louvre View Balcony', 'Marble Soaking Tub', 'Bespoke Butler Service', 'High-Speed Wi-Fi', 'Complimentary Champagne'],
      images: [
        '/images/rooms/paris-royal-suite-1.webp',
        '/images/rooms/paris-royal-suite-2.webp',
        '/images/rooms/paris-royal-suite-3.webp',
      ],
      basePriceINR: 45000,
      roomNumbers: ['201', '202', '203'],
    },
    {
      name: 'Deluxe Tuileries Room',
      slug: 'deluxe-tuileries-room',
      description: 'Elegant sanctuary dressed in soft French silks, featuring views of the Tuileries Garden and an Italian marble rain shower.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 50.0,
      amenities: ['Tuileries Garden View', 'Italian Marble Shower', 'High-Speed Wi-Fi', 'Nespresso Coffee Machine', 'Air Conditioning'],
      images: [
        '/images/rooms/paris-tuileries-1.webp',
        '/images/rooms/paris-tuileries-2.webp',
        '/images/rooms/paris-tuileries-3.webp',
      ],
      basePriceINR: 32000,
      roomNumbers: ['101', '102', '103'],
    },
    {
      name: 'Classic Haussmann Suite',
      slug: 'classic-haussmann-suite',
      description: 'Quintessential Parisian charm with high chevron parquet ceilings, period fireplace, and dual private balconies.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 65.0,
      amenities: ['Dual Private Balconies', 'Period Fireplace', 'High-Speed Wi-Fi', 'Air Conditioning', 'Turndown Service'],
      images: [
        '/images/rooms/paris-haussmann-1.webp',
        '/images/rooms/paris-haussmann-2.webp',
        '/images/rooms/paris-haussmann-3.webp',
      ],
      basePriceINR: 28000,
      roomNumbers: ['301', '302', '303'],
    },
  ]);

  // For Paris Hotel: Exactly ONE room (Deluxe Tuileries Room) has a 2nd package option
  const parisDeluxeRoomType = parisRooms.find((r) => r.slug === 'deluxe-tuileries-room');
  if (parisDeluxeRoomType) {
    await prisma.ratePlan.create({
      data: {
        room_type_id: parisDeluxeRoomType.id,
        name: 'Gourmet Breakfast & Spa Package',
        description:
          'Includes daily artisanal French buffet breakfast in the glass conservatory, priority thermal spa club access, and late checkout until 2:00 PM.',
        base_price_cents: 3650000, // ₹36,500
        cancellation_policy: CancellationPolicy.FREE_CANCELLATION,
        cancellation_deadline_hours: 48,
        is_default: false,
        is_active: true,
      },
    });
  }

  // Tokyo Rooms
  const tokyoRooms = await seedHotelRooms(hotelTokyo.id, [
    {
      name: 'Hinoki Sky Penthouse',
      slug: 'hinoki-sky-penthouse',
      description: 'Private rooftop residence wrapped in fragrant Hinoki cedar with an open-air rotenburo onsen overlooking the Tokyo Tower skyline.',
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedType: '1 King Bed',
      roomSizeSqm: 110.0,
      amenities: ['Private Open-Air Onsen', 'Tokyo Skyline Panorama', 'Traditional Tea Set', 'High-Speed Wi-Fi', 'Butler Service'],
      images: [
        '/images/rooms/tokyo-hinoki-penthouse-1.webp',
        '/images/rooms/tokyo-hinoki-penthouse-2.webp',
        '/images/rooms/tokyo-hinoki-penthouse-3.webp',
      ],
      basePriceINR: 52000,
      roomNumbers: ['801', '802', '803'],
    },
    {
      name: 'Traditional Tatami Suite',
      slug: 'traditional-tatami-suite',
      description: 'Authentic Ryokan luxury with woven rush-grass tatami flooring, Shoji paper screens, and artisanal matcha ceremonies.',
      maxGuests: 4,
      maxAdults: 3,
      maxChildren: 2,
      bedType: '2 Japanese Futons, 1 Queen Bed',
      roomSizeSqm: 68.0,
      amenities: ['Tatami Living Area', 'Hinoki Soaking Tub', 'Curated Tea Ceremony', 'High-Speed Wi-Fi', 'Yukata Robes'],
      images: [
        '/images/rooms/tokyo-tatami-suite-1.webp',
        '/images/rooms/tokyo-tatami-suite-2.webp',
        '/images/rooms/tokyo-tatami-suite-3.webp',
      ],
      basePriceINR: 36000,
      roomNumbers: ['501', '502', '503'],
    },
    {
      name: 'Modern Ginza Studio',
      slug: 'modern-ginza-studio',
      description: 'Sleek metropolitan studio equipped with acoustic soundproofing, rainfall spa shower, and smart home automation.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 42.0,
      amenities: ['Ginza City View', 'Rainfall Spa Shower', 'Smart Climate Control', 'High-Speed Wi-Fi', 'Soundproof Windows'],
      images: [
        '/images/rooms/tokyo-ginza-studio-1.webp',
        '/images/rooms/tokyo-ginza-studio-2.webp',
        '/images/rooms/tokyo-ginza-studio-3.webp',
      ],
      basePriceINR: 24000,
      roomNumbers: ['301', '302', '303'],
    },
  ]);

  // Bali Rooms
  const baliRooms = await seedHotelRooms(hotelBali.id, [
    {
      name: 'Oceanfront Cliffside Villa',
      slug: 'oceanfront-cliffside-villa',
      description: 'Dramatic standalone villa cantilevered over the Nusa Dua cliffs with private infinity plunge pool and sunset panorama.',
      maxGuests: 4,
      maxAdults: 2,
      maxChildren: 2,
      bedType: '1 King Bed, 1 Daybed',
      roomSizeSqm: 140.0,
      amenities: ['Private Infinity Pool', 'Cliffside Ocean View', 'Outdoor Stone Bathtub', 'High-Speed Wi-Fi', 'Floating Breakfast'],
      images: [
        '/images/rooms/bali-cliff-villa-1.webp',
        '/images/rooms/bali-cliff-villa-2.webp',
        '/images/rooms/bali-cliff-villa-3.webp',
      ],
      basePriceINR: 62000,
      roomNumbers: ['101', '102', '103'],
    },
    {
      name: 'Sunset Infinity Pool Suite',
      slug: 'sunset-infinity-pool-suite',
      description: 'Lush tropical hideaway with private plunge pool, open-air living pavilion, and sweeping Indian Ocean sunset vistas.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 90.0,
      amenities: ['Plunge Pool', 'Ocean Sunset View', 'Open-Air Living Pavilion', 'High-Speed Wi-Fi', 'Rain Shower'],
      images: [
        '/images/rooms/bali-sunset-pool-1.webp',
        '/images/rooms/bali-sunset-pool-2.webp',
        '/images/rooms/bali-sunset-pool-3.webp',
      ],
      basePriceINR: 42000,
      roomNumbers: ['201', '202', '203'],
    },
    {
      name: 'Lush Garden Sanctuary',
      slug: 'lush-garden-sanctuary',
      description: 'Peaceful garden suite immersed in fragrant frangipani blossoms with private sun terrace and hand-carved stone bath.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 65.0,
      amenities: ['Frangipani Garden Terrace', 'Stone Soaking Bath', 'High-Speed Wi-Fi', 'Air Conditioning', 'Espresso Bar'],
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
      name: 'Central Park Presidential Penthouse',
      slug: 'central-park-presidential-penthouse',
      description: 'Spectacular multi-room penthouse with wrap-around terrace overlooking Central Park and the Manhattan skyline.',
      maxGuests: 4,
      maxAdults: 3,
      maxChildren: 2,
      bedType: '1 King Bed, 1 Queen Bed',
      roomSizeSqm: 180.0,
      amenities: ['Central Park Terrace', 'Private Chef Kitchen', 'Gas Fireplace', 'High-Speed Wi-Fi', 'Private Elevator'],
      images: [
        '/images/rooms/ny-empire-suite-1.webp',
        '/images/rooms/ny-empire-suite-2.webp',
        '/images/rooms/ny-empire-suite-3.webp',
      ],
      basePriceINR: 78000,
      roomNumbers: ['4001', '4002', '4003'],
    },
    {
      name: 'Fifth Avenue Executive Suite',
      slug: 'fifth-avenue-executive-suite',
      description: 'Corner executive suite with floor-to-ceiling glass, marble bath with skyline views, and custom ergonomic executive desk.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 King Bed',
      roomSizeSqm: 65.0,
      amenities: ['Fifth Avenue Panorama', 'Executive Ergonomic Desk', 'Marble Soaking Tub', 'High-Speed Wi-Fi'],
      images: [
        '/images/rooms/ny-premier-studio-1.webp',
        '/images/rooms/ny-premier-studio-2.webp',
        '/images/rooms/ny-premier-studio-3.webp',
      ],
      basePriceINR: 34000,
      roomNumbers: ['2201', '2202', '2203'],
    },
    {
      name: 'Hudson River Skyline Loft',
      slug: 'hudson-river-skyline-loft',
      description: 'Chic open-concept industrial loft with exposed architectural columns and sweeping views toward the Hudson River.',
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: '1 Queen Bed',
      roomSizeSqm: 40.0,
      amenities: ['Hudson River View', 'Kitchenette', 'High-Speed Wi-Fi', 'Air Conditioning'],
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

  console.log('✓ Seeded 5 Approved Hotels, 15 Room Types with Collages, and 49 Physical Rooms.\n');

  // --------------------------------------------------------------------------
  // 6. CAREFULLY SEED THE ONE UNRATED COMPLETED STAY FOR test1@mail.com
  // --------------------------------------------------------------------------
  console.log('--- 5. Seeding Single Unrated Stay for test1@mail.com (Paris Hotel) ---');

  // Booking placed on Monday Nov 09 (Cash Inflow)
  // Check-in on Tuesday Nov 10 (Stay Revenue)
  // Check-out on Wednesday Nov 11 (Departure & Turnover Cleaning)
  const bookedDate = new Date('2026-11-09T14:30:00.000Z');
  const checkInDate = new Date('2026-11-10T14:00:00.000Z');
  const checkOutDate = new Date('2026-11-11T11:00:00.000Z');
  const checkedInAt = new Date('2026-11-10T14:30:00.000Z');
  const checkedOutAt = new Date('2026-11-11T10:45:00.000Z');

  const unratedParisRoomType = parisRooms[1]; // Deluxe Tuileries Room
  const unratedParisRatePlan = await prisma.ratePlan.findFirst({
    where: { room_type_id: unratedParisRoomType.id, is_default: true },
  });
  const unratedParisPhysicalRoom = await prisma.room.findFirst({
    where: { hotel_id: hotelParis.id, room_number: '101' },
  });

  const unratedNightlyRateCents = unratedParisRatePlan ? unratedParisRatePlan.base_price_cents : 3200000;
  const unratedSubtotalCents = unratedNightlyRateCents;
  const unratedTaxCents = Math.round(unratedSubtotalCents * 0.12);
  const unratedTotalCents = unratedSubtotalCents + unratedTaxCents;

  // A. Reservation: Status CHECKED_OUT with exact check-in and check-out timestamps
  const res = await prisma.reservation.create({
    data: {
      reservation_code: 'RES-PARIS-TEST1-101',
      hotel_id: hotelParis.id,
      guest_user_id: testGuest1.id,
      guest_name: 'TEST ONE',
      guest_email: testGuest1.email,
      guest_phone: '+91 98200 00001',
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      checked_in_at: checkedInAt,
      checked_out_at: checkedOutAt,
      total_rooms_count: 1,
      status: ReservationStatus.CHECKED_OUT,
      subtotal_cents: unratedSubtotalCents,
      tax_cents: unratedTaxCents,
      fees_cents: 0,
      total_cents: unratedTotalCents,
      currency: 'INR',
      is_walk_in: false,
      created_at: bookedDate,
    },
  });

  // B. ReservationRoom line
  const resRoom = await prisma.reservationRoom.create({
    data: {
      reservation_id: res.id,
      room_type_id: unratedParisRoomType.id,
      rate_plan_id: unratedParisRatePlan!.id,
      quantity: 1,
      nightly_rate_cents: unratedNightlyRateCents,
      total_price_cents: unratedTotalCents,
      nightly_breakdown: [
        {
          date: '2026-11-10',
          rate_cents: unratedNightlyRateCents,
          is_override: false,
        },
      ],
    },
  });

  // C. Room Assignment for Room 101 with timestamps
  if (unratedParisPhysicalRoom) {
    await prisma.roomAssignment.create({
      data: {
        reservation_id: res.id,
        reservation_room_id: resRoom.id,
        slot_index: 0,
        room_id: unratedParisPhysicalRoom.id,
        assigned_by_id: receptionistParis.id,
        assigned_at: checkedInAt,
        status: AssignmentStatus.RELEASED,
        released_at: checkedOutAt,
        release_reason: 'Normal Guest Checkout Completed',
      },
    });
  }

  // D. Payment on Monday Nov 09 (Cash Inflow for Manager & Admin Dashboards)
  await prisma.payment.create({
    data: {
      reservation_id: res.id,
      idempotency_key: 'IDEMP-RES-PARIS-TEST1-101',
      transaction_reference: 'TXN-RES-PARIS-TEST1-101',
      payment_provider: 'MOCK_PROVIDER',
      payment_method: 'MOCK_CARD',
      amount_cents: unratedTotalCents,
      currency: 'INR',
      status: PaymentStatus.SUCCESS,
      created_at: bookedDate,
    },
  });

  // E. Housekeeping Record showing the room was cleaned and set to READY
  // Turnover clean created upon checkout, started, completed and inspected
  const cleanCreated = new Date('2026-11-11T10:45:00.000Z');
  const cleanStarted = new Date('2026-11-11T11:00:00.000Z');
  const cleanCompleted = new Date('2026-11-11T11:45:00.000Z');

  if (unratedParisPhysicalRoom) {
    await prisma.housekeepingTask.create({
      data: {
        hotel_id: hotelParis.id,
        room_id: unratedParisPhysicalRoom.id,
        assigned_to_id: housekeepingParis.id,
        inspected_by_id: receptionistParis.id,
        task_type: TaskType.TURNOVER_CLEAN,
        status: TaskStatus.COMPLETED,
        notes: 'Automatic turnover clean on checkout for reservation RES-PARIS-TEST1-101',
        created_at: cleanCreated,
        started_at: cleanStarted,
        completed_at: cleanCompleted,
      },
    });

    // Confirm room operational status is set to READY after cleaning
    await prisma.room.update({
      where: { id: unratedParisPhysicalRoom.id },
      data: { operational_status: OperationalStatus.READY },
    });
  }

  // F. Notification for test1@mail.com to Rate Their Stay
  await prisma.notification.create({
    data: {
      user_id: testGuest1.id,
      title: 'Checkout Complete — Le Grand Luxe Paris',
      message: 'Thank you for staying at Le Grand Luxe Paris. How was your visit in the Deluxe Tuileries Room? Rate your stay to share your experience.',
      type: 'CHECKOUT_COMPLETE',
      metadata: {
        hotelId: hotelParis.id,
        hotelName: hotelParis.name,
        reservationId: res.id,
      },
      is_read: false,
      created_at: checkedOutAt,
    },
  });

  // G. Audit Trail Logs for Reservation Lifecycle & Room Cleaning
  await prisma.auditLog.createMany({
    data: [
      {
        hotel_id: hotelParis.id,
        actor_id: testGuest1.id,
        actor_role: 'GUEST',
        action: 'BOOKING_CONFIRMED',
        entity_type: 'Reservation',
        entity_id: res.id,
        new_state: `Reservation ${res.reservation_code} confirmed for Deluxe Tuileries Room`,
        created_at: bookedDate,
      },
      {
        hotel_id: hotelParis.id,
        actor_id: receptionistParis.id,
        actor_role: 'STAFF',
        action: 'ROOM_ASSIGNED',
        entity_type: 'RoomAssignment',
        entity_id: unratedParisPhysicalRoom?.id || res.id,
        new_state: `Room 101 assigned to reservation ${res.reservation_code} slot 0`,
        created_at: checkedInAt,
      },
      {
        hotel_id: hotelParis.id,
        actor_id: receptionistParis.id,
        actor_role: 'STAFF',
        action: 'CHECK_IN',
        entity_type: 'Reservation',
        entity_id: res.id,
        new_state: `Checked in ${res.reservation_code}. Room 101 set to OCCUPIED`,
        created_at: checkedInAt,
      },
      {
        hotel_id: hotelParis.id,
        actor_id: receptionistParis.id,
        actor_role: 'STAFF',
        action: 'CHECK_OUT',
        entity_type: 'Reservation',
        entity_id: res.id,
        new_state: `Checked out ${res.reservation_code}. Room 101 set to DIRTY, turnover clean created`,
        created_at: checkedOutAt,
      },
      {
        hotel_id: hotelParis.id,
        actor_id: housekeepingParis.id,
        actor_role: 'STAFF',
        action: 'ROOM_CLEANED',
        entity_type: 'Room',
        entity_id: unratedParisPhysicalRoom?.id || res.id,
        new_state: 'Turnover clean approved by Elin Lund. Room 101 returned to READY status.',
        created_at: cleanCompleted,
      },
    ],
  });

  console.log(`  ✓ Seeded Completed Stay: ${res.reservation_code} for ${testGuest1.email} (TEST ONE)`);
  console.log(`  ✓ Timestamps: Check-in: ${checkedInAt.toISOString()}, Check-out: ${checkedOutAt.toISOString()}`);
  console.log(`  ✓ Housekeeping: Clean created ${cleanCreated.toISOString()}, completed ${cleanCompleted.toISOString()}, Room 101 -> READY`);
  console.log(`  ✓ Financials: Payment of ₹${unratedTotalCents / 100} on Nov 09, stay revenue on Nov 10`);
  console.log(`  ✓ Unrated status: 0 reviews in DB (User test1@mail.com can rate their stay)\n`);

  // --------------------------------------------------------------------------
  // 7. INITIALIZE MONGODB ATLAS CUSTOM & 2DSPHERE INDEXES
  // --------------------------------------------------------------------------
  console.log('--- 6. Reconciling MongoDB Atlas Custom & 2dsphere Indexes ---');
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
