// apps/api/tests/milestone5.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Milestone 5: Interactive 3D Globe Discovery & Geographic Search API', () => {
  const app = createApp();

  it('serves active hotels as a GeoJSON FeatureCollection at GET /api/v1/hotels/map', async () => {
    const res = await request(app).get('/api/v1/hotels/map');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const featureCollection = res.body.data;
    expect(featureCollection.type).toBe('FeatureCollection');
    expect(Array.isArray(featureCollection.features)).toBe(true);
    expect(featureCollection.features.length).toBeGreaterThanOrEqual(1);

    const parisFeature = featureCollection.features.find(
      (f: any) => f.properties.city === 'Paris'
    );
    expect(parisFeature).toBeDefined();
    expect(parisFeature.type).toBe('Feature');
    expect(parisFeature.geometry.type).toBe('Point');
    // GeoJSON standard: [longitude, latitude]
    expect(parisFeature.geometry.coordinates).toHaveLength(2);
    expect(parisFeature.geometry.coordinates[0]).toBeCloseTo(2.3376, 3);
    expect(parisFeature.geometry.coordinates[1]).toBeCloseTo(48.8606, 3);

    // Verify properties payload
    expect(parisFeature.properties.name).toBe('Le Grand Luxe Paris');
    expect(parisFeature.properties.country).toBe('France');
    expect(parisFeature.properties.star_rating).toBe(5);
    expect(parisFeature.properties.starting_price_cents).toBeGreaterThan(0);
    expect(parisFeature.properties.total_rooms).toBeGreaterThan(0);
  });

  it('serves raw RFC 7946 GeoJSON when requested with ?format=geojson', async () => {
    const res = await request(app).get('/api/v1/hotels/map?format=geojson');
    expect(res.status).toBe(200);
    // Direct FeatureCollection root, not enveloped in data
    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
  });

  it('supports format=geojson on GET /api/v1/hotels as well', async () => {
    const res = await request(app).get('/api/v1/hotels?format=geojson');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
  });

  it('filters GeoJSON hotels by city query parameter', async () => {
    const res = await request(app).get('/api/v1/hotels/map?city=Paris');
    expect(res.status).toBe(200);
    const features = res.body.data.features;
    expect(features.length).toBeGreaterThanOrEqual(1);
    features.forEach((f: any) => {
      expect(f.properties.city.toLowerCase()).toContain('paris');
    });
  });

  it('filters GeoJSON hotels by category query parameter', async () => {
    const res = await request(app).get('/api/v1/hotels/map?category=LUXURY');
    expect(res.status).toBe(200);
    const features = res.body.data.features;
    expect(features.length).toBeGreaterThanOrEqual(1);
    features.forEach((f: any) => {
      expect(f.properties.category).toBe('LUXURY');
    });
  });
});

