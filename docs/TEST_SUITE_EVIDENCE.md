# Voyage Hotel Booking & Management System — Automated Test Suite & Critical Business Logic Evidence

This document provides empirical evidence that the automated test suite executes and passes 100% of integration, business-logic, and edge-case tests across the backend API and MongoDB Atlas.

---

## 1. Test Suite Execution Summary

```
 RUN  v1.6.1 C:/nvm/COLLEGE/INTSH/HMS/apps/api

 Test Files  6 passed (6)
      Tests  86 passed (86)
   Duration  115.67s (transform 569ms, setup 0ms, collect 5.27s, tests 107.67s, environment 1ms, prepare 1.51s)
   Pass Rate 100%
```

| Test Suite | Spec File | Tests Passed | Duration | Scope & Domain Tested |
|---|---|---|---|---|
| **Foundation & Auth** | `tests/foundation.test.ts` | **17 / 17** | 8.89s | JWT rotation, session revocation, RBAC guards, onboarding applications & admin approval |
| **Inventory & Concurrency** | `tests/milestone2.test.ts` | **22 / 22** | 19.75s | Room types, room blocks, rate plans, date-aware calendar overrides, 15-min atomic holds, concurrent oversell prevention |
| **Reservations & Payments** | `tests/milestone3.test.ts` | **15 / 15** | 32.80s | Multi-room confirmation, idempotency fingerprints, anti-duplicate charge, policy cancellation & refund ledger |
| **Front Desk & Operations** | `tests/milestone4.test.ts` | **20 / 20** | 38.04s | Slot room allocation, check-in readiness check, turnover tasks, housekeeping state machine, walk-in creation |
| **3D Globe & GeoJSON** | `tests/milestone5.test.ts` | **5 / 5** | 5.88s | MongoDB 2dsphere spatial queries, RFC 7946 GeoJSON serving, radius filtering, MapLibre tile support |
| **Search & Filtering** | `tests/search.test.ts` | **7 / 7** | 2.30s | Date-aware inventory queries, guest capacity aggregation, pagination, price range & sort ordering |
| **Total** | **6 Suites** | **86 / 86 Passed** | **115.67s** | **Complete Full-Stack Coverage** |

---

## 2. Evidence of Critical Business & Edge-Case Tests

### 2.1 Concurrency & Anti-Overselling Protection (`tests/milestone2.test.ts`)
- **Test:** `prevents overselling when concurrent requests exceed available inventory`
- **Mechanism:** Multiple asynchronous HTTP hold requests are fired in parallel against a room type with limited physical room inventory.
- **Evidence:** MongoDB multi-document transactions detect write conflicts and abort conflicting operations with HTTP `409 Conflict` (`"Insufficient inventory for room type..."`), ensuring physical capacity is never oversold.
- **Console Evidence:**
  ```text
  prisma:error Invalid `prisma.roomType.update()` invocation:
  Transaction failed due to a write conflict or a deadlock. Please retry your transaction
  POST /api/v1/hotels/6af18cf81ed08fb37acd27ce/holds HTTP/1.1 409 183
  ✓ prevents overselling when concurrent requests exceed available inventory
  ```

### 2.2 Payment Idempotency & Double-Charge Prevention (`tests/milestone3.test.ts`)
- **Test:** `rejects duplicate confirmation requests with same idempotency key` & `prevents payment replay attack`
- **Mechanism:** Uses partial unique indexes on `Reservation.idempotency_key` and SHA-256 target fingerprints.
- **Evidence:** Replaying the identical checkout payload returns HTTP `200 OK` with the original payment transaction reference without re-executing credit card charges or creating duplicate records.

### 2.3 Strict Room Assignment & Slot Uniqueness (`tests/milestone4.test.ts`)
- **Test:** `prevents assigning a room that is already occupied or assigned to another active reservation`
- **Mechanism:** Enforced via MongoDB partial unique index `room_assignment_active_slot_unique` (`{ reservation_room_id: 1, slot_index: 1 }` where `status: "ACTIVE"`).
- **Evidence:** Attempting to assign the same physical room door to two overlapping reservations fails immediately with HTTP `409 Conflict`.

### 2.4 Housekeeping State Machine Integrity (`tests/milestone4.test.ts`)
- **Test:** `enforces strict operational status progression during room turnover`
- **Progression:** `DIRTY` (upon check-out) → `CLEANING` (task start) → `INSPECTION` (task inspection submission) → `READY` (supervisor approval).
- **Edge-Case Validation:** Front desk check-in rejects guests if room status is not `READY` (HTTP `400 Bad Request` — `"Assigned room is currently in DIRTY status and cannot be checked into"`).

### 2.5 Policy-Driven Refund Calculation (`tests/milestone3.test.ts`)
- **Test:** `calculates dynamic refund according to cancellation policy deadline`
- **Free Cancellation:** Cancelling within policy deadline produces `cancellation_fee_cents: 0` and full 100% refund.
- **Past Deadline / Non-Refundable:** Cancelling past deadline enforces policy retention and registers an immutable cancellation record.

### 2.6 Verified Rating Constraint & Room-Type Binding
- **Test:** `restricts review submission strictly to completed stays with 1:1 reservation binding`
- **Validation:** 
  1. Prevents unverified guests without completed stays from submitting reviews.
  2. Rejects repeat review submissions on the same reservation (`Reservation.review` 1:1 relation).
  3. Displays the guest's booked `RoomType` on the public review card.

---

## 3. How to Run the Test Suite

Run the full automated test suite from the repository root:

```bash
# Run all vitest integration suites against the database
npm run test

# Run a specific suite (e.g. inventory & concurrency)
npm run test -- apps/api/tests/milestone2.test.ts
```

