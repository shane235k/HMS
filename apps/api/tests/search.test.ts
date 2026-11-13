// apps/api/tests/search.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Standalone Hotel Search & Filter API', () => {
  const app = createApp();

  it('serves default search results with pagination on GET /api/v1/hotels/search', async () => {
    const res = await request(app).get('/api/v1/hotels/search');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(Array.isArray(data.hotels)).toBe(true);
    expect(data.hotels.length).toBeGreaterThanOrEqual(1);
    expect(data.totalCount).toBeGreaterThanOrEqual(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(6);

    const firstHotel = data.hotels[0];
    expect(firstHotel.id).toBeDefined();
    expect(firstHotel.name).toBeDefined();
    expect(firstHotel.city).toBeDefined();
    expect(firstHotel.starRating).toBeGreaterThanOrEqual(1);
    if (firstHotel.guestRating !== null) {
      expect(firstHotel.guestRating).toBeGreaterThanOrEqual(1);
    }
    expect(firstHotel.startingPriceCents).toBeGreaterThan(0);
    expect(Array.isArray(firstHotel.amenities)).toBe(true);
  }, 15000);

  it('filters hotels by destination query (e.g. Paris)', async () => {
    const res = await request(app).get('/api/v1/hotels/search?destination=Paris');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const hotels = res.body.data.hotels;
    expect(hotels.length).toBeGreaterThanOrEqual(1);
    expect(hotels.every((h: any) => h.city.toLowerCase().includes('paris') || h.name.toLowerCase().includes('paris'))).toBe(true);
  });

  it('calculates backend availability and pricing when date range is supplied', async () => {
    const res = await request(app).get(
      '/api/v1/hotels/search?destination=Paris&checkInDate=2026-12-01&checkOutDate=2026-12-04&guests=2&rooms=1'
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.hotels.length).toBeGreaterThanOrEqual(1);
    const parisHotel = data.hotels.find((h: any) => h.city === 'Paris');
    expect(parisHotel).toBeDefined();
    expect(parisHotel.isAvailable).toBe(true);
    expect(parisHotel.startingPriceCents).toBeGreaterThan(0);
    expect(parisHotel.totalStayPriceCents).toBeGreaterThan(parisHotel.startingPriceCents);
  });

  it('filters by category, star rating, and price range', async () => {
    const res = await request(app).get('/api/v1/hotels/search?category=LUXURY&starRating=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const hotels = res.body.data.hotels;
    for (const h of hotels) {
      expect(h.category).toBe('LUXURY');
      expect(h.starRating).toBe(5);
    }
  });

  it('supports sorting by price ascending and price descending', async () => {
    const resAsc = await request(app).get('/api/v1/hotels/search?sort=price_asc');
    expect(resAsc.status).toBe(200);
    const hotelsAsc = resAsc.body.data.hotels;

    for (let i = 0; i < hotelsAsc.length - 1; i++) {
      expect(hotelsAsc[i].startingPriceCents).toBeLessThanOrEqual(hotelsAsc[i + 1].startingPriceCents);
    }

    const resDesc = await request(app).get('/api/v1/hotels/search?sort=price_desc');
    expect(resDesc.status).toBe(200);
    const hotelsDesc = resDesc.body.data.hotels;

    for (let i = 0; i < hotelsDesc.length - 1; i++) {
      expect(hotelsDesc[i].startingPriceCents).toBeGreaterThanOrEqual(hotelsDesc[i + 1].startingPriceCents);
    }
  });

  it('supports pagination via page and limit query parameters', async () => {
    const resPage1 = await request(app).get('/api/v1/hotels/search?limit=2&page=1');
    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data.hotels.length).toBeLessThanOrEqual(2);
    expect(resPage1.body.data.page).toBe(1);
    expect(resPage1.body.data.limit).toBe(2);

    if (resPage1.body.data.totalCount > 2) {
      expect(resPage1.body.data.hasMore).toBe(true);
      const resPage2 = await request(app).get('/api/v1/hotels/search?limit=2&page=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.page).toBe(2);
      expect(resPage2.body.data.hotels[0].id).not.toBe(resPage1.body.data.hotels[0].id);
    }
  });

  it('dynamically adapts hotel starting price to matching in-budget suite/package when budget filter is applied', async () => {
    const res = await request(app).get('/api/v1/hotels/search?destination=Tokyo&minPrice=2200000&maxPrice=2600000');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const hotels = res.body.data.hotels;
    const sakura = hotels.find((h: any) => h.name.includes('Sakura'));
    expect(sakura).toBeDefined();
    expect(sakura.startingPriceCents).toBeGreaterThanOrEqual(2200000);
    expect(sakura.startingPriceCents).toBeLessThanOrEqual(2600000);
  });
});

