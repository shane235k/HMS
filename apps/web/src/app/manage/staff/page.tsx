// apps/web/src/app/manage/staff/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, ApiError } from '@/lib/api';
import { StaffSummary, Role } from '@hbms/shared';
import { Users, Plus, ShieldCheck, Mail, Phone, Calendar, Power } from 'lucide-react';

export default function StaffManagementPage() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Staff123!');
  const [role, setRole] = useState<Role.RECEPTIONIST | Role.HOUSEKEEPING>(Role.RECEPTIONIST);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<StaffSummary[]>('/management/staff');
      setStaffList(data);
    } catch (err: any) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      await apiFetch('/management/staff', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          role,
        }),
      });

      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      await loadStaff();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to create staff account.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/management/staff/${staffId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff status');
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">Staff Management</h1>
            <p className="text-xs text-charcoal-500 font-normal">Manage Receptionist and Housekeeping operational roles</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-lg gap-2 text-xs font-normal"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Staff Member</span>
          </Button>
        </header>

        <main className="p-6 space-y-6 max-w-[1400px] w-full">
          <Card className="rounded-2xl border-charcoal-200 bg-white shadow-card overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="font-normal text-charcoal-900">Assigned Property Staff Roster</CardTitle>
                <CardDescription className="font-normal text-charcoal-500">
                  Staff members created here have access restricted solely to your hotel property.
                </CardDescription>
              </div>
              <div className="text-xs font-mono text-charcoal-500 bg-canvas-neutral px-3 py-1 rounded-lg border border-charcoal-200 font-normal">
                Total Staff: {staffList.length}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-charcoal-500 animate-pulse font-normal">
                  Loading staff accounts...
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-12 text-center text-charcoal-500 space-y-2">
                  <Users className="w-8 h-8 text-charcoal-300 mx-auto" />
                  <p className="text-sm font-normal text-charcoal-800">No staff members onboarded yet</p>
                  <p className="text-xs text-charcoal-400 font-normal">
                    Click "Onboard Staff Member" to provision receptionist and housekeeping logins.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas-neutral border-y border-charcoal-200/80 text-[11px] font-mono uppercase text-charcoal-600 font-normal">
                        <th className="py-3 px-5 font-normal">Staff Member</th>
                        <th className="py-3 px-5 font-normal">Operational Role</th>
                        <th className="py-3 px-5 font-normal">Contact Details</th>
                        <th className="py-3 px-5 font-normal">Account Status</th>
                        <th className="py-3 px-5 text-right font-normal">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-200/60 font-sans">
                      {staffList.map((item) => {
                        const first = item.user?.firstName || (item.user as any)?.first_name || '';
                        const last = item.user?.lastName || (item.user as any)?.last_name || '';
                        const initial = (first[0] || last[0] || 'S').toUpperCase();
                        const isActive = item.isActive ?? (item as any)?.is_active ?? true;

                        return (
                          <tr key={item.id} className="hover:bg-canvas-neutral/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center font-normal text-neutral-800 text-xs shrink-0">
                                  {initial}
                                </div>
                                <div>
                                  <div className="font-normal text-charcoal-900">
                                    {first} {last}
                                  </div>
                                  <div className="text-[11px] text-charcoal-500 font-mono font-normal">
                                    ID: {item.id.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-5">
                              <Badge variant={item.role === Role.RECEPTIONIST ? 'primary' : 'inspection'} className="font-normal">
                                {item.role}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-5 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-charcoal-700 font-normal">
                                <Mail className="w-3.5 h-3.5 text-charcoal-400" />
                                <span>{item.user?.email || '—'}</span>
                              </div>
                              {item.user?.phone && (
                                <div className="flex items-center gap-1.5 text-charcoal-500 text-[11px] font-normal">
                                  <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                                  <span>{item.user.phone}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-5">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-normal">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-charcoal-400 font-normal">
                                  <span className="w-2 h-2 rounded-full bg-charcoal-400" />
                                  Deactivated
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-5 text-right">
                              <Button
                                variant={isActive ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={() => handleToggleStatus(item.id, isActive)}
                                className="text-xs h-7 px-2.5 font-normal"
                              >
                                <Power className="w-3.5 h-3.5 mr-1" />
                                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Onboard Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard Hotel Staff"
        description="Create credentials for a Receptionist or Housekeeping employee bound to this property."
      >
        {formError && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Marc"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Staff Email"
            type="email"
            placeholder="marc.dupont@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+33 1 42 68 00 12"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
              Assigned Operational Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-charcoal-200 text-charcoal-900 focus:outline-none focus:border-black"
            >
              <option value={Role.RECEPTIONIST}>RECEPTIONIST (Front Desk, Arrivals, Walk-Ins)</option>
              <option value={Role.HOUSEKEEPING}>HOUSEKEEPING (Cleaning, Inspection, Maintenance)</option>
            </select>
          </div>

          <Input
            label="Initial Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading}>
              Onboard Staff Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

