// apps/web/src/app/admin/applications/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, ApiError } from '@/lib/api';
import { HotelApplicationSummary, ApplicationStatus } from '@hbms/shared';
import {
  FileCheck2,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<HotelApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Review State
  const [selectedApp, setSelectedApp] = useState<HotelApplicationSummary | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState<ApplicationStatus.APPROVED | ApplicationStatus.REJECTED>(
    ApplicationStatus.APPROVED
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HotelApplicationSummary[]>('/applications');
      setApplications(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load hotel applications.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const openReviewModal = (
    app: HotelApplicationSummary,
    status: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED
  ) => {
    setSelectedApp(app);
    setDecision(status);
    setRejectionReason('');
    setAdminNotes('');
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setReviewLoading(true);
    setReviewError(null);

    try {
      await apiFetch(`/applications/${selectedApp.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          rejectionReason: decision === ApplicationStatus.REJECTED ? rejectionReason : undefined,
          adminNotes,
        }),
      });

      setIsReviewModalOpen(false);
      await loadApplications();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setReviewError(err.message);
      } else {
        setReviewError('Failed to review application.');
      }
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">Hotel Registration Review Queue</h1>
            <p className="text-xs text-charcoal-500">Verify property documents, geocoded coordinates, and onboard new hotels</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-canvas-neutral px-3 py-1.5 rounded-lg border border-charcoal-200">
            <span>Pending Reviews: </span>
            <span className="font-normal text-black">
              {applications.filter((a) => a.status === ApplicationStatus.PENDING || a.status === ApplicationStatus.UNDER_REVIEW).length}
            </span>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-[1400px] w-full">
          <Card className="rounded-2xl border-charcoal-200 bg-white shadow-card overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle>Application Dossiers</CardTitle>
                <CardDescription>
                  Review prospective hotel properties. Approving an application automatically activates the hotel and binds its 1:1 manager.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-charcoal-500 animate-pulse">
                  Loading application dossiers...
                </div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center text-charcoal-500 space-y-2">
                  <FileCheck2 className="w-8 h-8 text-charcoal-300 mx-auto" />
                  <p className="text-sm font-normal">No applications found</p>
                  <p className="text-xs text-charcoal-400">Newly submitted hotel onboarding dossiers will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas-neutral border-y border-charcoal-200/80 text-[11px] font-mono uppercase text-charcoal-600 font-normal">
                        <th className="py-3 px-5">Hotel Property & Category</th>
                        <th className="py-3 px-5">Applicant Manager</th>
                        <th className="py-3 px-5">Geocoded Location</th>
                        <th className="py-3 px-5">Legal & Tax ID</th>
                        <th className="py-3 px-5">Application Status</th>
                        <th className="py-3 px-5 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-200/60 font-sans">
                      {applications.map((app) => {
                        const raw = app as any;
                        const hotelName = app.hotelName || raw.hotel_name || '—';
                        const applicantFirst = app.applicant?.firstName || raw.applicant?.first_name || '';
                        const applicantLast = app.applicant?.lastName || raw.applicant?.last_name || '';
                        const applicantName = `${applicantFirst} ${applicantLast}`.trim() || '—';
                        const email = app.contactEmail || raw.contact_email || app.applicant?.email || raw.applicant?.email || '—';
                        const phone = app.contactPhone || raw.contact_phone || '—';
                        const regNumber = app.businessRegistrationNumber || raw.business_registration_number || '—';
                        const taxId = app.taxId || raw.tax_id || '—';
                        const rawDate = app.createdAt || raw.created_at;
                        const formattedDate = rawDate && !isNaN(new Date(rawDate).getTime())
                          ? new Date(rawDate).toLocaleDateString()
                          : '—';

                        return (
                          <tr key={app.id} className="hover:bg-canvas-neutral/50 transition-colors">
                            <td className="py-4 px-5">
                              <div className="space-y-1">
                                <div className="font-normal text-charcoal-900 text-sm">{hotelName}</div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="primary" className="font-normal">{app.category}</Badge>
                                  <span className="text-[10px] text-charcoal-500 font-mono">
                                    {formattedDate}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              <div className="space-y-0.5">
                                <div className="font-normal text-charcoal-900">
                                  {applicantName}
                                </div>
                                <div className="text-[11px] text-charcoal-500">{email}</div>
                                <div className="text-[11px] text-charcoal-400 font-mono">{phone}</div>
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              <div className="space-y-0.5">
                                <div className="text-charcoal-800 font-normal">
                                  {app.city}, {app.country}
                                </div>
                                <div className="text-[11px] text-charcoal-500 truncate max-w-xs">{app.address}</div>
                                <div className="text-[10px] text-neutral-600 font-mono">
                                  Lat: {Number(app.latitude).toFixed(4)}, Lng: {Number(app.longitude).toFixed(4)}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-5 font-mono text-[11px] space-y-0.5">
                              <div className="text-charcoal-700">Reg: {regNumber}</div>
                              <div className="text-charcoal-500">Tax: {taxId}</div>
                            </td>

                            <td className="py-4 px-5">
                              <Badge
                                variant={
                                  app.status === ApplicationStatus.APPROVED
                                    ? 'approved'
                                    : app.status === ApplicationStatus.PENDING
                                    ? 'pending'
                                    : app.status === ApplicationStatus.UNDER_REVIEW
                                    ? 'primary'
                                    : 'rejected'
                                }
                                className="font-normal"
                              >
                                {app.status}
                              </Badge>
                              {app.adminNotes && (
                                <p className="text-[10px] text-charcoal-500 italic mt-1 line-clamp-1 font-normal">
                                  {app.adminNotes}
                                </p>
                              )}
                            </td>

                            <td className="py-4 px-5 text-right">
                              {app.status === ApplicationStatus.APPROVED ? (
                                <span className="text-emerald-700 text-xs font-normal inline-flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => openReviewModal(app, ApplicationStatus.APPROVED)}
                                    className="h-7 px-2.5 text-xs font-normal"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => openReviewModal(app, ApplicationStatus.REJECTED)}
                                    className="h-7 px-2.5 text-xs font-normal"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
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

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={decision === ApplicationStatus.APPROVED ? 'Approve Hotel Application' : 'Reject Hotel Application'}
        description={`Target property: ${selectedApp?.hotelName || (selectedApp as any)?.hotel_name || ''}`}
      >
        {reviewError && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-normal">
            {reviewError}
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-canvas-neutral border border-charcoal-200 text-xs space-y-1.5 font-normal">
            <div className="flex justify-between">
              <span className="text-charcoal-700 font-normal">Applicant:</span>
              <span className="text-charcoal-900 font-normal">
                {selectedApp?.applicant?.firstName || (selectedApp as any)?.applicant?.first_name}{' '}
                {selectedApp?.applicant?.lastName || (selectedApp as any)?.applicant?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-700 font-normal">Location:</span>
              <span className="text-charcoal-900 font-normal">{selectedApp?.city}, {selectedApp?.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-700 font-normal">Category:</span>
              <span className="font-mono text-neutral-800 font-normal">{selectedApp?.category}</span>
            </div>
          </div>

          {decision === ApplicationStatus.REJECTED && (
            <div>
              <label className="block text-xs font-normal uppercase tracking-wider text-charcoal-700 mb-1.5">
                Rejection Reason (Sent to applicant)
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Incomplete business registry documents or inaccurate address coordinates..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-charcoal-200 text-charcoal-900 focus:outline-none focus:border-black font-normal"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-normal uppercase tracking-wider text-charcoal-700 mb-1.5">
              Admin Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Verified trade license, geocoded pins confirmed on map..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-charcoal-200 text-charcoal-900 focus:outline-none focus:border-black font-normal"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setIsReviewModalOpen(false)} className="font-normal">
              Cancel
            </Button>
            <Button
              type="submit"
              variant={decision === ApplicationStatus.APPROVED ? 'primary' : 'danger'}
              isLoading={reviewLoading}
              className="font-normal"
            >
              {decision === ApplicationStatus.APPROVED ? 'Confirm & Activate Hotel' : 'Confirm Rejection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
