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

## 4. Complete Lifecycle Guide: Setup & Execution

### Prerequisites
- **Node.js**: `v18+` (Tested on `v20.x` and `v22.x`)
- **npm**: `v10+`
- **MongoDB Atlas**: Active cluster connection URI with replica set enabled (MongoDB Atlas M0 Free Tier or higher, required for Prisma multi-document transactions)

---

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd HMS
```

---

### Step 2: Environment Configuration
Create the root environment configuration:
```bash
cp .env.example .env
```

Configure `.env` in the repository root:
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

Create and configure `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_GEOAPIFY_API_KEY=""
```

---

### Step 3: Install Dependencies
Install all workspace dependencies from the root:
```bash
npm install
```

---

### Step 4: Build Monorepo Packages
Compile the internal shared packages (`@hbms/shared` and `@hbms/database`):
```bash
npm run build:packages
```

---

### Step 5: Push Database Schema & Reconcile Indexes
Sync the Prisma schema directly to MongoDB Atlas:
```bash
npm run db:push
```

---

### Step 6: Seed Database
Execute the sole, authoritative database seed file ([`packages/database/prisma/seed.ts`](packages/database/prisma/seed.ts)):
```bash
npm run db:seed
```

> [!NOTE]
> `npm run db:seed` clears all old collections and populates:
> - **Platform Admin** and all staff accounts for **5 international hotels** (Managers, Receptionists, and Housekeeping).
> - **5 Approved Hotel Properties**: Paris, Tokyo, Bali, New York, and Dubai with GeoJSON location coordinates.
> - **15 Room Types**: 3 distinct classes per hotel with verified local image collages (`/images/rooms/...`).
> - **49 Physical Rooms** initialized to `READY` status with floor mappings.
> - **Commercial Rate Plans**: Best available flexible rates and curated breakfast/spa packages with descriptions.
> - **Sole Guest Account**: `test1@mail.com` (**TEST ONE**) with exactly 1 completed unrated stay (`RES-PARIS-TEST1-101`) to test verified checkout notifications and rating workflows.
> - **MongoDB 2dsphere Indexes**: Geospatial indexing on `Hotel.location` for globe and radius queries.

---

### Step 7: Run Development Servers
Start both the Express API and Next.js web application concurrently:
```bash
npm run dev
```

Or run each service in independent terminal sessions:
```bash
# Terminal 1: Express REST API (Runs on port 5000)
npm run dev:api

# Terminal 2: Next.js Web Application (Runs on port 3000)
npm run dev:web
```

Access the web interface at **[http://localhost:3000](http://localhost:3000)** and the API health check at **[http://localhost:5000/api/health](http://localhost:5000/api/health)**.

---

### Step 8: Run Automated Test Suites
Execute the full integration test suite across all 6 test modules:
```bash
npm run test
```

---

### Step 9: Production Build
Compile both applications for production deployment:
```bash
npm run build
```

---

## 5. Seeded Demo Accounts & Credentials

All seeded credentials configured in the authoritative seed script ([`packages/database/prisma/seed.ts`](packages/database/prisma/seed.ts)):

### Platform Administration
| Role | Email Address | Password | Permissions & Property Scope |
|------|---------------|----------|-------------------------------|
| **Platform Admin** | `admin@hbms.com` | `Admin123!` | Global platform governance, hotel applications, property suspensions & audit logs |

### Hotel Managers (5 Properties)
| Property | Manager Email | Password | Scope & Responsibilities |
|----------|---------------|----------|--------------------------|
| **Le Grand Luxe Paris (Primary)** | `m1@mail.com` | `123456789` | Inventory, rate plans, staff management, and Paris revenue dashboard |
| **Le Grand Luxe Paris (Alt)** | `manager.paris@grandluxe.com` | `Manager123!` | Le Grand Luxe Paris alternate manager credentials |
| **Sakura Boutique Hotel Tokyo** | `manager.tokyo@sakura.com` | `Manager123!` | Tokyo property management & revenue analytics |
| **Azure Haven Resort Bali** | `manager.bali@azurehaven.com` | `Manager123!` | Bali resort operations & commercial rate plans |
| **The Manhattan Executive Suites NY** | `manager.ny@manhattan.com` | `Manager123!` | New York property management & night audit |
| **Emirates Mirage Palace Dubai** | `manager.dubai@palace.com` | `Manager123!` | Dubai luxury palace management & occupancy metrics |

### Front Desk Receptionists (5 Properties)
| Property | Receptionist Email | Password | Operational Scope |
|----------|--------------------|----------|-------------------|
| **Le Grand Luxe Paris** | `receptionist.paris@grandluxe.com` | `Staff123!` | Check-in, check-out, room allocation, walk-in reservations, audit trails |
| **Sakura Boutique Hotel Tokyo** | `receptionist.tokyo@sakura.com` | `Staff123!` | Tokyo arrival & departure roster, room keys |
| **Azure Haven Resort Bali** | `receptionist.bali@azurehaven.com` | `Staff123!` | Bali arrival & departure roster, room allocation |
| **The Manhattan Executive Suites NY** | `receptionist.ny@manhattan.com` | `Staff123!` | New York front desk operations, walk-in bookings |
| **Emirates Mirage Palace Dubai** | `receptionist.dubai@palace.com` | `Staff123!` | Dubai front desk arrivals, guest checkout, departures |

### Housekeeping Operations (5 Properties)
| Property | Housekeeper Email | Password | Operational Scope |
|----------|-------------------|----------|-------------------|
| **Le Grand Luxe Paris** | `housekeeping.paris@grandluxe.com` | `Staff123!` | Paris turnover cleaning queue, inspection submissions |
| **Sakura Boutique Hotel Tokyo** | `housekeeping.tokyo@sakura.com` | `Staff123!` | Tokyo room cleaning queue, room condition reporting |
| **Azure Haven Resort Bali** | `housekeeping.bali@azurehaven.com` | `Staff123!` | Bali villa turnover cleaning, maintenance issue reporting |
| **The Manhattan Executive Suites NY** | `housekeeping.ny@manhattan.com` | `Staff123!` | New York suite turnover cleaning & inspection workflow |
| **Emirates Mirage Palace Dubai** | `housekeeping.dubai@palace.com` | `Staff123!` | Dubai palace turnover cleaning & inspection workflow |

### Sole Guest Account & Historical Stay Record
| Role | Email Address | Password | Guest Name | Seeded Stay & Activity |
|------|---------------|----------|------------|------------------------|
| **Verified Guest** | `test1@mail.com` | `123456789` | **TEST ONE** | Completed stay `RES-PARIS-TEST1-101` at *Le Grand Luxe Paris* (Room 101, Nov 10–11, 2026; ₹28,000 paid). Unrated with active checkout notification to demonstrate rating modal. |

---

## 6. End-to-End User Journeys

### 1. Consumer / Guest Journey
1. **Search & 3D Globe:** Search destinations (Paris, Tokyo, Bali, New York, Dubai) with date pickers (supporting same-day check-in) and guest counts (including "All Rooms").
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

---

## 10. Production Deployment Guide

Deploying separately (Vercel for Next.js frontend, Render for Express backend) is recommended because the Express API maintains persistent TCP connection pools to MongoDB Atlas, while Next.js leverages Vercel's edge network:

### Backend API (Render Web Service)
- **Repository Root:** `.` (monorepo root)
- **Runtime:** `Node`
- **Build Command:** `npm install --include=dev && npm run build:api`
- **Start Command:** `node apps/api/dist/server.js`
- **Health Check Path:** `/api/health`
- **Environment Variables:**
  - `NODE_ENV=production`
  - `PORT=10000`
  - `DATABASE_URL` (MongoDB Atlas connection string)
  - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
  - `CLIENT_URL=https://<your-app>.vercel.app`

### Frontend Web (Vercel)
- **Framework Preset:** `Next.js`
- **Root Directory:** `apps/web`
- **Build Command (Override):** `cd ../.. && npm install && npm run build:web`
- **Output Directory:** `.next`
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=https://<your-render-url>.onrender.com/api/v1`
  - `NEXT_PUBLIC_GEOAPIFY_API_KEY=<your-geoapify-key>`

