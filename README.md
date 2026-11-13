# Hotel Booking Management System (HBMS) — Voyage

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Replica%20Set-green.svg)](https://www.mongodb.com/atlas)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-1.6-yellow.svg)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)

**Voyage** is an enterprise-grade, full-stack hotel booking and hospitality property management system (PMS). It pairs an interactive consumer discovery and reservation engine (complete with 3D Globe visualization, same-day bookings, and verified stay ratings) with full property management capabilities (room inventory, commercial rate plans, front desk reception, housekeeping turnover, financial analytics, and platform governance).

---

## 1. System Architecture

Voyage is organized as a clean **Modular Monolith** inside an npm workspaces monorepo:

```
HMS/
├── apps/
│   ├── web/                         # Next.js 14 (App Router), Tailwind CSS, Lucide Icons, MapLibre GL
│   └── api/                         # Node.js + Express + TypeScript REST API Backend
│
├── packages/
│   ├── database/                    # Prisma ORM, MongoDB Atlas schema, 2dsphere indexes & sole seed script
│   └── shared/                      # Isomorphic TypeScript interfaces, enums, Zod validation & currency utils
│
├── docs/                            # Core Technical Documentation
│   ├── ER_DIAGRAM.md                # Entity-Relationship diagram, collections, relationships & indexes
│   ├── API_DOCUMENTATION.md         # Complete REST API specification with endpoints, schemas & errors
│   └── TEST_SUITE_EVIDENCE.md       # Vitest execution evidence & critical business edge-case verification
│
├── package.json                     # Monorepo root workspace scripts
├── .env.example                     # Environment configuration template
└── README.md                        # Master project guide
```

---

## 2. Key Architectural Invariants & Business Rules

1. **MongoDB Atlas Multi-Document ACID Transactions:** All state changes (holds, reservation confirmations, cancellations, front desk check-in/out, and room inventory updates) execute within Prisma multi-document transactions on a MongoDB Atlas Replica Set cluster.
2. **Optimistic Concurrency Control (OCC):** Overselling is eliminated under high concurrency via version counters (`RoomType.version` and `Room.version`). Conflicting requests trigger safe `HTTP 409 Conflict` before payment execution.
3. **15-Minute Temporary Holds:** When a traveler initiates checkout, room capacity is atomically locked for 15 minutes (`hold_expires_at`). Availability queries mathematically exclude expired holds in real-time.
4. **Strict 1:1 Hotel Manager Constraint:** A Property Manager can manage exactly one approved hotel property at a time (enforced via database partial unique index on `Hotel.manager_id` and middleware).
5. **Verified Review Constraint & Room Type Attribution:** Guests can only review a hotel if they have an active, completed stay (`CHECKED_OUT`). Reviews are strictly bound 1:1 to the reservation, and public reviews explicitly showcase the exact room type the guest booked.
6. **Same-Day Bookings & Cash-Inflow Alignment:** Travelers can book stays starting on the current calendar day. Financial dashboards track both payment transaction dates (cash inflow) and guest arrival dates (realized stay revenue).

---

## 3. Technology Stack

| Layer | Technology | Key Capabilities |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript | Server & Client Components, Responsive UI, MapLibre GL, Context API |
| **Styling** | Tailwind CSS 3.4, Lucide React Icons | Monochromatic design system, accessible form controls, responsive grids |
| **Backend** | Express 4.19, TypeScript 5.4 | Modular controllers, services, Zod validation, JWT with token rotation |
| **Database** | MongoDB Atlas (Replica Set M0+), Prisma ORM 5.22 | Multi-document ACID transactions, 2dsphere geospatial & custom partial unique indexes |
| **Validation** | Zod 3.23 | Shared isomorphic request validation schemas across frontend and backend |
| **Testing** | Vitest 1.6, Supertest | 86 passing integration tests covering concurrency, RBAC, and full hotel lifecycles |

---

## 4. Quick Start & Local Setup

### Prerequisites
- **Node.js** `v18+` (Tested on `v20.x` and `v22.x`)
- **npm** `v10+`
- **MongoDB Atlas** cluster connection string (Free M0 Sandbox or any replica set URI)

### 1. Clone & Configure Environment
```bash
git clone <repository-url>
cd HMS

# Create root environment configuration
cp .env.example .env
```

Edit `.env` and supply your MongoDB Atlas connection string:
```env
PORT=5000
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hotel_management?retryWrites=true&w=majority"
JWT_ACCESS_SECRET="dev-jwt-access-secret-minimum-32-chars-long"
JWT_REFRESH_SECRET="dev-jwt-refresh-secret-minimum-32-chars-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:3000"
NEXT_PUBLIC_GEOAPIFY_API_KEY=""
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_GEOAPIFY_API_KEY=""
```

### 2. Install Dependencies & Build Packages
```bash
npm install
npm run build:packages
```

### 3. Initialize Database Schema & Run the Sole Seed Script
```bash
# Push Prisma schema to MongoDB Atlas
npm run db:push

# Run the single authoritative seed script (seeds users, hotels, rooms, stays, reviews & indexes)
npm run db:seed
```

> [!NOTE]
> `npm run db:seed` executes the sole database seed file ([`packages/database/prisma/seed.ts`](packages/database/prisma/seed.ts)). It automatically creates all demo accounts, approved hotels, room types, rate plans, physical rooms, completed stays, verified reviews, and reconciles the MongoDB Atlas 2dsphere geospatial indexes.

### 4. Run Development Servers
```bash
# Run both Backend API and Frontend Web client concurrently:
npm run dev

# Or run separately:
npm run dev:api    # Express API on http://localhost:5000
npm run dev:web    # Next.js Web Client on http://localhost:3000
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 5. Seeded Demo Accounts

All seeded credentials configured in [`packages/database/prisma/seed.ts`](packages/database/prisma/seed.ts):

| Role | Email Address | Password | Permissions & Property Scope |
|------|---------------|----------|-------------------------------|
| **Platform Admin** | `admin@hbms.com` | `Admin123!` | Global platform governance, hotel approvals, suspensions, and audit logs |
| **Hotel Manager (Paris)** | `m1@mail.com` | `123456789` | **Le Grand Luxe Paris**: inventory, rate calendar, staff, and financial dashboard |
| **Hotel Manager (Alt)** | `manager.paris@grandluxe.com` | `Manager123!` | Le Grand Luxe Paris (alternate login) |
| **Front Desk Reception** | `receptionist.paris@grandluxe.com` | `Staff123!` | Le Grand Luxe Paris: check-in, check-out, room allocation, walk-ins |
| **Housekeeping** | `housekeeping.paris@grandluxe.com` | `Staff123!` | Le Grand Luxe Paris: turnover cleaning queue, inspection requests |
| **Guest (Verified Paris Stay)** | `test2@mail.com` | `123456789` | Completed stay in Room 201 (Royal Palais Suite), verified rating showcase |
| **Guest (Verified Tokyo Stay)** | `test1@mail.com` | `123456789` | Completed stay in Tokyo (Modern Ginza Studio) |
| **Guest (Verified Bali Stay)** | `test3@mail.com` | `123456789` | Completed stay in Bali (Oceanfront Cliffside Villa) |
| **Guest (Verified Mandi Stay)** | `test4@mail.com` | `123456789` | Completed stay in Mandi (Himalayan Mountain Suite) |
| **Standard Guest** | `guest.sophia@example.com` | `Guest123!` | Consumer discovery, search, temporary holds, and reservations |

---

## 6. End-to-End User Journeys

### 1. Consumer / Guest Journey
1. **Search & 3D Globe:** Search destinations (Paris, Tokyo, Bali, New York, Dubai, Mandi) with date pickers (supporting same-day check-in) and guest counts (including "All Rooms").
2. **Room Selection:** Browse room categories, high-resolution WebP collages, amenities, and commercial rate plans.
3. **15-Minute Temporary Hold:** Locks inventory atomically; shows a live 15-minute countdown clock.
4. **Sandbox Payment:** Enter card details (`4242...`) with target-fingerprinted idempotency; receive a cryptographic confirmation code (e.g. `RES-REV-PARIS-101`).
5. **Verified Reviews:** After stay completion, submit an authentic rating. The review appears publicly with the booked room type badge.

### 2. Property Manager Journey
1. **Inventory & Rooms:** View room categories, capacity, physical room numbers, and floors.
2. **Rates & Calendar:** Configure rate plans (flexible vs packages) and apply date-specific pricing overrides.
3. **Staff Profiles:** Assign and manage Receptionist and Housekeeping team members.
4. **Revenue Analytics:** Inspect both **Cash Inflow** (by booking payment date) and **Realized Stay Revenue** (by guest check-in arrival date) with daily night audit metrics (RevPAR, ADR, Occupancy).

### 3. Front Desk Reception Journey
1. **Arrivals & Departures:** Track daily arrival rosters, departures, and in-house guests.
2. **Room Allocation:** Assign physical rooms to reservation slots; check-in validates room cleanliness (`READY` only).
3. **Check-In & Check-Out:** Check-in sets room to `OCCUPIED`. Check-out marks room `DIRTY` and queues an automated turnover cleaning task.
4. **Walk-Ins:** Generate on-the-spot walk-in bookings with instant physical key allocation.

### 4. Housekeeping & Turnover Journey
1. **Task Queue:** View room turnover tasks categorized by floor and status.
2. **Turnover Progression:** Staff moves room from `DIRTY` &rarr; `CLEANING` &rarr; `INSPECTION`.
3. **Supervisor Approval:** Only authorized staff can inspect and certify room back to `READY`.
4. **Maintenance Reporting:** Flag room defects with priority levels (`LOW` to `CRITICAL`).

### 5. Platform Admin Governance
1. **Application Review:** Inspect hotel registration dossiers and approve/reject partner properties.
2. **Directory & Auditing:** View all properties globally, suspend/reactivate with mandatory audit remarks, and inspect immutable system audit logs.

---

## 7. API Specification Overview

The backend REST API is hosted on port `5000` with the `/api/v1` prefix. Complete endpoint documentation is in [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

| Module | Route Prefix | Key Endpoints | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` | JWT auth with database token rotation |
| **Applications** | `/api/v1/applications` | `POST /`, `GET /my`, `GET /`, `POST /:id/review` | Property registration & admin onboarding |
| **Management** | `/api/v1/management` | `GET /property`, `GET /staff`, `GET /reports/daily`, `POST /room-types`, `POST /rate-plans` | Property manager operations |
| **Hotels** | `/api/v1/hotels` | `GET /search`, `GET /map`, `GET /:id`, `GET /:id/availability`, `POST /:id/holds`, `POST /:id/reviews` | Public search, geocoding, holds & ratings |
| **Reservations** | `/api/v1/reservations` | `GET /my`, `GET /:id`, `POST /:id/confirm`, `POST /:id/cancel`, `POST /:id/refund/retry` | Booking lifecycle & sandbox payments |
| **Reception** | `/api/v1/reception` | `GET /arrivals`, `GET /departures`, `POST /reservations/:id/assign`, `POST /reservations/:id/check-in`, `POST /walk-in` | Front desk operational console |
| **Housekeeping** | `/api/v1/housekeeping`| `GET /dashboard`, `POST /tasks/:id/start`, `POST /tasks/:id/approve-inspection`, `POST /issues` | Turnover clean & inspection workflow |
| **Admin** | `/api/v1/admin` | `GET /hotels`, `PATCH /hotels/:id/status`, `GET /stats`, `GET /audit-logs` | Platform governance & audit trail |
| **Notifications** | `/api/v1/notifications`| `GET /`, `PATCH /:id/read`, `PATCH /read-all` | Real-time user alert badges |

---

## 8. Running Automated Tests

Voyage includes an automated test suite powered by Vitest, verifying concurrency, anti-overselling, RBAC authorization, and state machines against MongoDB Atlas:

```bash
# Execute the full automated test suite
npm run test
```

### Verified Test Suite Results:
```text
 Test Files  6 passed (6)
      Tests  86 passed (86)
   Duration  115.67s (100% Pass Rate)

 ✓ tests/milestone4.test.ts  (20 tests) — Reception check-in/out, room assignment, housekeeping turnover, supervisor approval
 ✓ tests/milestone2.test.ts  (22 tests) — Inventory creation, rate plans, calendar overrides, OCC hold overselling prevention
 ✓ tests/milestone3.test.ts  (15 tests) — Reservation confirmation, card payment, double-charge idempotency, cancellation refund tiers
 ✓ tests/foundation.test.ts  (17 tests) — Authentication, refresh token rotation, 1:1 manager lock, property staff isolation
 ✓ tests/search.test.ts      (7 tests)  — Search filters, destination geocoding, capacity validation, date integrity
 ✓ tests/milestone5.test.ts  (5 tests)  — GeoJSON spatial endpoints, MapLibre tile support
```

Detailed test evidence and logs are documented in [`docs/TEST_SUITE_EVIDENCE.md`](docs/TEST_SUITE_EVIDENCE.md).

---

## 9. Known Limitations

1. **MongoDB Atlas Multi-Document Transaction Requirement (Replica Set Only):**
   All critical booking state transitions, temporary inventory holds, room allocations, and payment registrations execute inside atomic multi-document transactions (`prisma.$transaction`). This requires a **MongoDB Replica Set** cluster (such as MongoDB Atlas M0 Free Tier or higher). Running the system against a standalone local MongoDB instance without an active replica set oplog will fail on transaction execution.

2. **Geoapify API Rate Limiting on Free Tier:**
   The interactive 3D Globe vector tile styles and destination geocoding autocomplete query Geoapify's public API. The free plan enforces a rate limit of **3,000 credits/day and 5 requests/second**. Extremely rapid searching or large concurrent bursts of traffic can temporarily trigger HTTP `429 Too Many Requests`.

3. **Simulated Payment Gateway (No Live Banking Webhooks):**
   Payment processing is handled via an internal `MockPaymentProvider` that validates card formatting, simulates issuing bank declines/timeouts, and records immutable transaction references (`TXN-*`). The system does not connect to live banking payment rails (such as live Stripe or Razorpay webhooks); live card processing requires plugging in an external provider SDK.

4. **UTC System Clock Date Boundaries for Same-Day Stays:**
   Same-day booking eligibility, temporary hold expiration timers, and midnight turnover transitions are evaluated against the backend server's UTC system clock. If a guest books from a timezone significantly ahead of or behind UTC (such as near 23:55 or 00:05), operational date boundaries reflect the UTC calendar date.
