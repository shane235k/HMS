# Voyage Hotel Booking & Management System — REST API Documentation

> **Base URL:** `http://localhost:5000/api/v1`  
> **Protocol:** HTTP/1.1 REST  
> **Content-Type:** `application/json`  
> **Standard Response Format:** `{ "success": true, "data": ... }`  
> **Standard Error Format:** `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Register as a new Guest or prospective Hotel Manager.
- **Request Body:**
  ```json
  {
    "email": "manager.new@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+91 9876543210",
    "role": "HOTEL_MANAGER" // "GUEST" | "HOTEL_MANAGER"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "email": "...", "role": "HOTEL_MANAGER", "hotelId": null },
      "tokens": { "accessToken": "eyJ...", "refreshToken": "..." }
    }
  }
  ```

### `POST /auth/login`
Authenticate existing user and receive JWT session tokens.
- **Request Body:**
  ```json
  {
    "email": "manager.paris@grandluxe.com",
    "password": "Manager123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "...",
        "email": "manager.paris@grandluxe.com",
        "role": "HOTEL_MANAGER",
        "hotelId": "6af18cf81ed08fb37acd27ce",
        "hasActiveApplication": true
      },
      "tokens": { "accessToken": "...", "refreshToken": "..." }
    }
  }
  ```

### `GET /auth/me`
Retrieve active session profile and assigned property scope.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):** `{ "success": true, "data": { ...user } }`

---

## 2. Hotel Discovery & Search (`/hotels`)

### `GET /hotels/search`
Search available hotels by destination, date range, capacity, and filters.
- **Query Parameters:**
  - `destination`: string (e.g. `Paris`, `Delhi`)
  - `checkInDate`: string (`YYYY-MM-DD`)
  - `checkOutDate`: string (`YYYY-MM-DD`)
  - `guests`: integer (default `2`)
  - `category`: `LUXURY` | `BOUTIQUE` | `BUSINESS` | `RESORT` | `BUDGET`
  - `starRating`: integer (`1` to `5`)
  - `page`: integer (default `1`)
  - `limit`: integer (default `6`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "hotels": [
        {
          "id": "...",
          "name": "Le Grand Luxe Paris",
          "city": "Paris",
          "country": "France",
          "starRating": 5,
          "startingPriceCents": 3500000,
          "images": ["/images/rooms/..."]
        }
      ],
      "totalCount": 1,
      "page": 1,
      "limit": 6
    }
  }
  ```

### `GET /hotels/:id`
Retrieve complete hotel profile, available room categories, rate plans, and reviews.
- **Response (200 OK):** `{ "success": true, "data": { "hotel": { ... } } }`

### `GET /hotels/:id/reviews`
List verified guest reviews for a hotel. Returns author name, star rating, comment, stay date, and the specific booked room type.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "reviews": [
        {
          "id": "...",
          "rating": 5,
          "title": "Exceptional luxury experience",
          "comment": "The suite was immaculate with breathtaking views.",
          "stay_date": "November 2026",
          "user": { "first_name": "Sophia", "last_name": "M." },
          "room_type": { "id": "...", "name": "Royal Palais Suite" }
        }
      ]
    }
  }
  ```

### `POST /hotels/:id/reviews`
Submit a verified stay review. Strict 1:1 reservation binding; requires a completed (`CHECKED_OUT`) stay.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "reservationId": "...",
    "rating": 5,
    "title": "Wonderful stay in Paris",
    "comment": "Staff hospitality was unmatched and the location is perfect."
  }
  ```
- **Response (201 Created):** `{ "success": true, "data": { "review": { ... } } }`
- **Error (409 Conflict / 400 Bad Request):** If user has already reviewed this stay or stay is not yet checked out.

### `GET /hotels/map` & `GET /hotels?format=geojson`
Serves RFC 7946 GeoJSON FeatureCollection of all approved hotels for the 3D MapLibre interactive globe.
- **Query Parameters:** `category`, `city`, `format=geojson`
- **Response (200 OK):** GeoJSON FeatureCollection with point geometries `[longitude, latitude]` and property metadata.

---

## 3. Reservations & Temporary Holds (`/hotels/:id/holds` & `/reservations`)

### `POST /hotels/:id/holds`
Create a 15-minute temporary reservation hold, deducting inventory from public availability.
- **Request Body:**
  ```json
  {
    "checkInDate": "2026-12-10",
    "checkOutDate": "2026-12-13",
    "guestName": "Sophia Martinez",
    "guestEmail": "guest.sophia@example.com",
    "guestPhone": "+91 9876543210",
    "rooms": [{ "roomTypeId": "...", "ratePlanId": "...", "quantity": 1 }]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "reservation": {
        "id": "...",
        "booking_reference": "RES-E3A9F1",
        "status": "TEMPORARY_HOLD",
        "hold_expires_at": "2026-11-12T02:00:00.000Z",
        "total_cents": 10500000
      }
    }
  }
  ```

### `POST /reservations/:id/confirm`
Confirm an active hold with mock card payment. Protected by `idempotencyKey`.
- **Request Body:**
  ```json
  {
    "idempotencyKey": "PAY-UUID-12345",
    "paymentMethod": "CARD",
    "cardDetails": {
      "cardNumber": "4242424242424242",
      "cardholderName": "Sophia Martinez",
      "expMonth": 12,
      "expYear": 2028,
      "cvc": "123"
    }
  }
  ```
- **Response (201 Created or 200 Replay):**
  ```json
  {
    "success": true,
    "data": {
      "isReplay": false,
      "reservation": { "status": "CONFIRMED", "booking_reference": "RES-E3A9F1" },
      "payment": { "status": "SUCCESS", "transaction_reference": "TXN-MOCK-..." }
    }
  }
  ```

### `POST /reservations/:id/cancel`
Cancel a confirmed reservation and trigger refund calculation based on policy.
- **Request Body:** `{ "reason": "Change of travel plans" }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "reservation": { "status": "CANCELLED" },
      "cancellation": {
        "eligible_refund_cents": 10500000,
        "cancellation_fee_cents": 0,
        "policy_applied": "FREE_CANCELLATION"
      }
    }
  }
  ```

---

## 4. Property Management (`/management`)

*All routes require role `HOTEL_MANAGER` or `PLATFORM_ADMIN`.*

### `POST /management/room-types`
Create a new room category.
- **Request Body:**
  ```json
  {
    "name": "Imperial Suite",
    "description": "Penthouse suite with panoramic views",
    "maxGuests": 4,
    "maxAdults": 3,
    "maxChildren": 2,
    "bedType": "1 King Bed + 1 Daybed",
    "roomSizeSqm": 85.0,
    "amenities": ["High-Speed Wi-Fi", "Private Balcony", "Marble Bath"],
    "images": ["data:image/webp;base64,..."],
    "basePriceCents": 3500000
  }
  ```

### `PUT /management/room-types/:id`
Update an existing room category (supports in-place Update mode).
- **Request Body:** Same fields as create (OCC version-guarded).

### `POST /management/rooms`
Create a physical room door assignment.
- **Request Body:**
  ```json
  {
    "roomTypeId": "...",
    "roomNumber": "501",
    "floor": 5,
    "operationalStatus": "READY"
  }
  ```

### `GET /management/reports/daily?date=YYYY-MM-DD`
Retrieve live operational metrics, revenue figures, RevPAR, ADR, and turnaround status counts.

---

## 5. Front Desk Operations (`/reception`)

*Requires role `RECEPTIONIST`, `HOTEL_MANAGER`, or `PLATFORM_ADMIN`.*

- `GET  /reception/arrivals?date=YYYY-MM-DD` — Expected guest arrivals.
- `GET  /reception/departures?date=YYYY-MM-DD` — Expected guest check-outs.
- `GET  /reception/in-house` — Currently staying guests.
- `POST /reception/reservations/:id/assign` — Assign physical room door to slot.
- `POST /reception/reservations/:id/check-in` — Check in guest (validates room is `READY` &rarr; sets `OCCUPIED`).
- `POST /reception/reservations/:id/check-out` — Check out guest (sets room to `DIRTY` & auto-queues `TURNOVER_CLEAN`).

---

## 6. Housekeeping Operations (`/housekeeping`)

- `GET   /housekeeping/tasks` — List turnover and cleaning queues.
- `PATCH /housekeeping/tasks/:id/start` — Start cleaning (`DIRTY` &rarr; `CLEANING`).
- `PATCH /housekeeping/tasks/:id/finish` — Submit for inspection (`CLEANING` &rarr; `INSPECTION`).
- `PATCH /housekeeping/tasks/:id/approve` — Supervisor approval (`INSPECTION` &rarr; `READY`). *Role gated: Manager, Receptionist, Admin only.*
- `POST  /housekeeping/issues` — Report room maintenance issue (`MAINTENANCE`).
- `PATCH /housekeeping/issues/:id/resolve` — Resolve issue &rarr; sets room to `DIRTY` with clean task.

---

## 7. Platform Governance (`/admin`)

*Requires role `PLATFORM_ADMIN`.*

- `GET   /admin/stats` — Global platform metrics (portfolio counts, total rooms, gross revenue, commission).
- `GET   /admin/hotels` — Global property directory.
- `PATCH /admin/hotels/:id/status` — Suspend or reactivate hotel with mandatory audit reason.
- `GET   /admin/applications` — Review queue of submitted hotel onboarding dossiers.
- `POST  /admin/applications/:id/review` — Approve or reject hotel application (atomic provisioning).
- `GET   /admin/audit-logs` — Immutable audit trail of critical actions across all hotels.

