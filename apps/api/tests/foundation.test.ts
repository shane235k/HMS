// apps/api/tests/foundation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '@hbms/database';
import { Role } from '@hbms/shared';

const app = createApp();

describe('Milestone 1 — Project Foundation Integration Tests', () => {
  let adminToken: string;
  let managerParisToken: string;
  let guestToken: string;
  let applicantToken: string;
  let applicantUserId: string;
  let submittedAppId: string;
  let parisHotelId: string;

  beforeAll(async () => {
    // 1. Authenticate as Platform Admin (from seed)
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hbms.com', password: 'Admin123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.tokens.accessToken;

    // 2. Authenticate as Paris Hotel Manager (from seed)
    const mgrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager.paris@grandluxe.com', password: 'Manager123!' });
    expect(mgrRes.status).toBe(200);
    managerParisToken = mgrRes.body.data.tokens.accessToken;
    parisHotelId = mgrRes.body.data.user.hotelId;

    // 3. Authenticate as Guest
    const guestRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });
    expect(guestRes.status).toBe(200);
    guestToken = guestRes.body.data.tokens.accessToken;
  });

  describe('1. System Health & Infrastructure', () => {
    it('should return UP on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('2. Authentication & Token Lifecycle', () => {
    it('should successfully register a new user', async () => {
      const testEmail = `test.user.${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'Guest',
          role: Role.GUEST,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@hbms.com', // existing email
          password: 'Password123!',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject login with incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@hbms.com', password: 'WrongPassword999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should rotate refresh token and issue fresh access token', async () => {
      // Login first to get refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });

      const oldRefreshToken = loginRes.body.data.tokens.refreshToken;

      // Use refresh token
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.tokens.accessToken).toBeDefined();
      const newRefreshToken = refreshRes.body.data.tokens.refreshToken;
      expect(newRefreshToken).toBeDefined();

      // Old refresh token must now be revoked
      const reuseOldRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(reuseOldRes.status).toBe(401);
    });

    it('should revoke refresh token on logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'guest.sophia@example.com', password: 'Guest123!' });

      const refreshToken = loginRes.body.data.tokens.refreshToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      const tryUse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(tryUse.status).toBe(401);
    });
  });

  describe('3. Role-Based & Resource Authorization Foundations', () => {
    it('should reject unauthenticated request to protected admin route', async () => {
      const res = await request(app).get('/api/v1/applications');
      expect(res.status).toBe(401);
    });

    it('should reject GUEST attempting to access PLATFORM_ADMIN applications queue (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow PLATFORM_ADMIN to view applications queue', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Hotel Application Submission & Admin Approval Workflow', () => {
    it('should register a new applicant user and submit hotel application', async () => {
      const applicantEmail = `applicant.vienna.${Date.now()}@palace.at`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: applicantEmail,
          password: 'Password123!',
          firstName: 'Franz',
          lastName: 'Weber',
          role: Role.HOTEL_MANAGER,
        });

      applicantToken = regRes.body.data.tokens.accessToken;
      applicantUserId = regRes.body.data.user.id;

      const appRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          hotelName: 'Vienna Imperial Grand Palace',
          businessRegistrationNumber: 'AT-VIE-2026-991',
          taxId: 'ATU99201928',
          contactEmail: 'imperial@vienna.at',
          contactPhone: '+43 1 515800',
          address: 'Kärntner Ring 16',
          city: 'Vienna',
          state: 'Vienna',
          country: 'Austria',
          postalCode: '1010',
          latitude: 48.2015,
          longitude: 16.3712,
          category: 'LUXURY',
          description: 'Historic Ringstraße landmark hotel with classical ballrooms.',
        });

      expect(appRes.status).toBe(201);
      expect(appRes.body.data.status).toBe('PENDING');
      submittedAppId = appRes.body.data.id;
    });

    it('should allow applicant to view their submitted application status', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(submittedAppId);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should allow Platform Admin to approve application, creating Hotel and binding 1:1 Manager', async () => {
      const approveRes = await request(app)
        .post(`/api/v1/applications/${submittedAppId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          adminNotes: 'Verified Austrian trade license and fire code compliance.',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.application.status).toBe('APPROVED');
      expect(approveRes.body.data.hotel).toBeDefined();
      expect(approveRes.body.data.hotel.name).toBe('Vienna Imperial Grand Palace');
      expect(approveRes.body.data.hotel.manager_id).toBe(applicantUserId);

      // Verify hotel is now discoverable in public listings
      const publicRes = await request(app).get('/api/v1/hotels');
      expect(publicRes.status).toBe(200);
      const found = publicRes.body.data.some((h: any) => h.id === approveRes.body.data.hotel.id);
      expect(found).toBe(true);
    });

    it('should ENFORCE strict 1:1 Manager relationship: Manager cannot manage multiple hotels', async () => {
      // Attempt to submit a second application with applicant who already manages Vienna hotel
      const secondAppRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          hotelName: 'Second Illegal Hotel Vienna',
          businessRegistrationNumber: 'AT-VIE-2026-992',
          taxId: 'ATU99201929',
          contactEmail: 'second@vienna.at',
          contactPhone: '+43 1 515801',
          address: 'Herrengasse 10',
          city: 'Vienna',
          state: 'Vienna',
          country: 'Austria',
          postalCode: '1010',
          latitude: 48.2095,
          longitude: 16.3652,
          category: 'BOUTIQUE',
        });

      expect(secondAppRes.status).toBe(409);
      expect(secondAppRes.body.error.message).toContain('at most one hotel');
    });
  });

  describe('5. Staff Identity & Property Scoping Foundations', () => {
    let createdStaffId: string;

    it('should allow Hotel Manager to create receptionist account for their hotel', async () => {
      const staffEmail = `reception.paris.${Date.now()}@grandluxe.com`;
      const res = await request(app)
        .post('/api/v1/management/staff')
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({
          email: staffEmail,
          password: 'StaffPassword123!',
          firstName: 'Marc',
          lastName: 'Dupont',
          role: Role.RECEPTIONIST,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.hotel_id).toBe(parisHotelId);
      expect(res.body.data.role).toBe(Role.RECEPTIONIST);
      expect(res.body.data.is_active).toBe(true);
      createdStaffId = res.body.data.id;
    });

    it('should list staff members belonging strictly to the managers assigned property', async () => {
      const res = await request(app)
        .get('/api/v1/management/staff')
        .set('Authorization', `Bearer ${managerParisToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned staff must belong to Paris hotel
      res.body.data.forEach((s: any) => {
        expect(s.hotel_id).toBe(parisHotelId);
      });
    });

    it('should allow Hotel Manager to deactivate a staff member', async () => {
      const res = await request(app)
        .patch(`/api/v1/management/staff/${createdStaffId}/status`)
        .set('Authorization', `Bearer ${managerParisToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    it('should prevent cross-property staff mutation: Manager A cannot alter staff of Hotel B', async () => {
      // Authenticate as Tokyo Manager
      const tokyoRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'manager.tokyo@sakura.com', password: 'Manager123!' });

      const tokyoToken = tokyoRes.body.data.tokens.accessToken;

      // Tokyo manager attempts to alter Paris staff member
      const tamperRes = await request(app)
        .patch(`/api/v1/management/staff/${createdStaffId}/status`)
        .set('Authorization', `Bearer ${tokyoToken}`)
        .send({ isActive: true });

      expect(tamperRes.status).toBe(404); // Staff member not found in Tokyo roster
    });
  });

  afterAll(async () => {
    // Clean up temporary Vienna hotel and applicant created during foundation tests
    await prisma.hotel.deleteMany({
      where: { name: 'Vienna Imperial Grand Palace' },
    });
    await prisma.hotelApplication.deleteMany({
      where: { hotel_name: 'Vienna Imperial Grand Palace' },
    });
    if (applicantUserId) {
      await prisma.user.deleteMany({
        where: { id: applicantUserId },
      });
    }
  });
});

