// apps/web/src/app/housekeeping/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, ApiError } from '@/lib/api';
import { Role } from '@hbms/shared';
import {
  Sparkles,
  ClipboardList,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Play,
  Check,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Clock,
  Download,
  Layers,
} from 'lucide-react';

interface HousekeepingMetrics {
  totalRooms: number;
  dirtyCount: number;
  cleaningCount: number;
  inspectionCount: number;
  readyCount: number;
  maintenanceCount: number;
  pendingCount?: number;
  completedCount?: number;
  openTasksCount?: number;
  completedTasksToday?: number;
  openMaintenanceCount?: number;
  roomStatusCounts?: Record<string, number>;
  taskStatusCounts?: Record<string, number>;
}

interface HousekeepingTask {
  id: string;
  type: string;
  status: string;
  notes?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: { id: string; first_name: string; last_name: string };
  inspected_by?: { id: string; first_name: string; last_name: string };
  room: {
    id: string;
    room_number: string;
    floor: number;
    operational_status: string;
    room_type?: { name: string };
  };
}

interface MaintenanceIssue {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reported_at: string;
  room: {
    id: string;
    room_number: string;
    floor: number;
    operational_status: string;
  };
}

export default function HousekeepingPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HousekeepingMetrics | null>(null);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [maintenanceIssues, setMaintenanceIssues] = useState<MaintenanceIssue[]>([]);
  const [activeQueue, setActiveQueue] = useState<'ALL' | 'DIRTY' | 'CLEANING' | 'INSPECTION' | 'COMPLETED' | 'MAINTENANCE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Maintenance Report Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [issueRoomId, setIssueRoomId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState('MEDIUM');
  const [issueLoading, setIssueLoading] = useState(false);

  // Pure housekeeping staff cannot approve inspections
  const canApproveInspection =
    user?.role === Role.HOTEL_MANAGER ||
    user?.role === Role.RECEPTIONIST ||
    user?.role === Role.PLATFORM_ADMIN;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, tasksData, issuesData] = await Promise.all([
        apiFetch<HousekeepingMetrics>('/housekeeping/dashboard'),
        apiFetch<HousekeepingTask[]>('/housekeeping/tasks'),
        apiFetch<MaintenanceIssue[]>('/housekeeping/issues'),
      ]);
      setMetrics(metricsData);
      setTasks(tasksData);
      setMaintenanceIssues(issuesData);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load housekeeping operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Start Cleaning
  const handleStartCleaning = async (taskId: string) => {
    try {
      await apiFetch(`/housekeeping/tasks/${taskId}/start`, { method: 'POST' });
      setActionSuccess('Cleaning started! Room operational status set to CLEANING.');
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to start cleaning');
    }
  };

  // 2. Submit for Inspection
  const handleSubmitInspection = async (taskId: string) => {
    try {
      await apiFetch(`/housekeeping/tasks/${taskId}/submit-inspection`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Cleaning completed. Ready for supervisor inspection.' }),
      });
      setActionSuccess('Cleaning submitted for supervisor inspection! Room set to INSPECTION.');
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit for inspection');
    }
  };

  // 3. Approve Inspection (Mark READY)
  const handleApproveInspection = async (taskId: string) => {
    if (!canApproveInspection) {
      setError('Authorization error: Pure housekeeping cleaners cannot mark rooms READY without supervisor approval.');
      return;
    }
    try {
      await apiFetch(`/housekeeping/tasks/${taskId}/approve-inspection`, { method: 'POST' });
      setActionSuccess('Inspection approved! Room operational status marked READY for guests.');
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve inspection');
    }
  };

  // 4. Report Maintenance Issue
  const openReportIssueModal = async () => {
    setIsIssueModalOpen(true);
    try {
      const rooms = await apiFetch<any[]>('/management/rooms');
      setAllRooms(rooms);
      if (rooms.length > 0) setIssueRoomId(rooms[0].id);
    } catch {
      // Fallback
    }
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueLoading(true);
    try {
      await apiFetch('/housekeeping/issues', {
        method: 'POST',
        body: JSON.stringify({
          roomId: issueRoomId,
          title: issueTitle,
          description: issueDescription,
          priority: issuePriority,
        }),
      });
      setActionSuccess('Maintenance issue reported! Room transitioned to MAINTENANCE status.');
      setIsIssueModalOpen(false);
      setIssueTitle('');
      setIssueDescription('');
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to report maintenance issue');
    } finally {
      setIssueLoading(false);
    }
  };

  // 5. Resolve Maintenance Issue
  const handleResolveIssue = async (issueId: string) => {
    try {
      await apiFetch(`/housekeeping/issues/${issueId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes: 'Issue repaired and tested. Sent for turnover clean.' }),
      });
      setActionSuccess('Maintenance issue resolved! Room set to DIRTY and turnover cleaning task generated.');
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve maintenance issue');
    }
  };

  // Filter tasks according to active queue
  const filteredTasks = tasks.filter((t) => {
    if (activeQueue === 'ALL') return true;
    if (activeQueue === 'DIRTY') return t.status === 'PENDING';
    if (activeQueue === 'CLEANING') return t.status === 'IN_PROGRESS';
    if (activeQueue === 'INSPECTION') return t.status === 'AWAITING_INSPECTION';
    if (activeQueue === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">Housekeeping Operations</h1>
            <Badge variant="primary" className="text-[11px] font-normal">
              Turnover & Inspection
            </Badge>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={openReportIssueModal}
              className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Report Maintenance Issue</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs font-normal"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {/* Notifications */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 font-bold">
                ×
              </button>
            </div>
          )}

          {/* 6 Real-Time Operational Queue Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card
              className={`p-4 cursor-pointer transition-all ${
                activeQueue === 'DIRTY' ? 'ring-2 ring-black bg-white shadow-sm' : 'bg-white hover:border-neutral-300'
              }`}
              onClick={() => setActiveQueue('DIRTY')}
            >
              <span className="text-xs text-charcoal-500 font-medium">Dirty Rooms</span>
              <div className="text-2xl font-bold font-mono text-red-600 my-1">
                {metrics?.dirtyCount ?? metrics?.roomStatusCounts?.DIRTY ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Awaiting cleaner start</span>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all ${
                activeQueue === 'CLEANING' ? 'ring-2 ring-black bg-white shadow-sm' : 'bg-white hover:border-neutral-300'
              }`}
              onClick={() => setActiveQueue('CLEANING')}
            >
              <span className="text-xs text-charcoal-500 font-medium">Cleaning In Progress</span>
              <div className="text-2xl font-bold font-mono text-amber-600 my-1">
                {metrics?.cleaningCount ?? metrics?.roomStatusCounts?.CLEANING ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Actively in service</span>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all ${
                activeQueue === 'INSPECTION' ? 'ring-2 ring-black bg-white shadow-sm' : 'bg-white hover:border-neutral-300'
              }`}
              onClick={() => setActiveQueue('INSPECTION')}
            >
              <span className="text-xs text-charcoal-500 font-medium">Inspection Queue</span>
              <div className="text-2xl font-bold font-mono text-indigo-600 my-1">
                {metrics?.inspectionCount ?? metrics?.roomStatusCounts?.INSPECTION ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Ready for supervisor sign-off</span>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all ${
                activeQueue === 'COMPLETED' ? 'ring-2 ring-black bg-white shadow-sm' : 'bg-white hover:border-neutral-300'
              }`}
              onClick={() => setActiveQueue('COMPLETED')}
            >
              <span className="text-xs text-charcoal-500 font-medium">Completed Stays</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 my-1">
                {metrics?.completedCount ?? metrics?.taskStatusCounts?.COMPLETED ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Finished stay turnovers</span>
            </Card>

            <Card className="p-4 bg-white">
              <span className="text-xs text-charcoal-500 font-medium">Ready for Guests</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 my-1">
                {metrics?.readyCount ?? metrics?.roomStatusCounts?.READY ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Available for check-in</span>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all ${
                activeQueue === 'MAINTENANCE' ? 'ring-2 ring-black bg-white shadow-sm' : 'bg-white hover:border-neutral-300'
              }`}
              onClick={() => setActiveQueue('MAINTENANCE')}
            >
              <span className="text-xs text-charcoal-500 font-normal">Open Maintenance</span>
              <div className="text-2xl font-normal font-mono text-rose-600 my-1">
                {metrics?.maintenanceCount ?? metrics?.openMaintenanceCount ?? 0}
              </div>
              <span className="text-[11px] text-charcoal-400">Damages or repairs</span>
            </Card>
          </div>

          {/* Queue Filter Tabs */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-charcoal-200">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: 'All Tasks' },
                { id: 'DIRTY', label: 'Pending Clean' },
                { id: 'CLEANING', label: 'In Progress' },
                { id: 'INSPECTION', label: 'Awaiting Inspection' },
                { id: 'COMPLETED', label: 'Completed Stays' },
                { id: 'MAINTENANCE', label: 'Maintenance' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveQueue(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-all ${
                    activeQueue === tab.id
                      ? 'bg-black text-white shadow-sm'
                      : 'text-charcoal-600 hover:bg-canvas-neutral'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-charcoal-400 font-mono hidden md:inline">
              Role: <span className="text-charcoal-800 font-normal">{user?.role}</span>
              {!canApproveInspection && ' (Cleaners require supervisor sign-off)'}
            </span>
          </div>

          {/* Active Maintenance Issues View */}
          {activeQueue === 'MAINTENANCE' ? (
            <div className="space-y-3">
              <h2 className="text-sm font-normal text-charcoal-900">Active Room Maintenance Issues</h2>
              {maintenanceIssues.length === 0 ? (
                <Card className="p-8 text-center text-charcoal-500 text-xs">
                  No open maintenance issues reported for this property.
                </Card>
              ) : (
                maintenanceIssues.map((issue) => (
                  <Card key={issue.id} className="p-4 bg-white border-charcoal-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-normal text-sm text-charcoal-900 font-mono">
                            Room {issue.room?.room_number ?? 'N/A'} (Floor {issue.room?.floor ?? 1})
                          </span>
                          <Badge variant="rejected" className="font-normal">{issue.priority}</Badge>
                          <Badge variant="neutral" className="font-normal">{issue.status}</Badge>
                        </div>
                        <h4 className="text-xs font-normal text-charcoal-800">{issue.title}</h4>
                        <p className="text-xs text-charcoal-600 font-light">{issue.description}</p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveIssue(issue.id)}
                        className="text-xs gap-1.5 font-normal"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resolve & Send to Dirty</span>
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Turnover Cleaning & Inspection Tasks Queue */
            <div className="space-y-3">
              {loading ? (
                <div className="h-48 rounded-xl bg-white border border-charcoal-200 animate-pulse flex items-center justify-center text-xs text-charcoal-400 font-normal">
                  Loading Housekeeping Tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <Card className="p-10 text-center text-charcoal-500 text-xs bg-white">
                  No active cleaning tasks in this queue.
                </Card>
              ) : (
                filteredTasks.map((t) => {
                  const resCodeMatch = t.notes?.match(/RES-[A-Za-z0-9-]+/i);
                  const reservationCode = resCodeMatch ? resCodeMatch[0] : null;
                  const isCompleted = t.status === 'COMPLETED';
                  const isInProgress = t.status === 'IN_PROGRESS';
                  const isAwaitingInspection = t.status === 'AWAITING_INSPECTION';
                  const isPending = t.status === 'PENDING';

                  return (
                    <Card
                      key={t.id}
                      className={`p-4 transition-colors ${
                        isCompleted
                          ? 'bg-neutral-50/70 border-neutral-200 shadow-none'
                          : 'bg-white border-charcoal-200 shadow-sm hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Room & Status Info */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${
                              isCompleted
                                ? 'bg-emerald-50 border-emerald-200'
                                : isInProgress
                                ? 'bg-amber-50 border-amber-200'
                                : isAwaitingInspection
                                ? 'bg-indigo-50 border-indigo-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <span className="text-[10px] text-charcoal-400 uppercase font-mono">Room</span>
                            <span className="text-base font-normal font-mono text-black">
                              {t.room?.room_number ?? 'N/A'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-charcoal-900">
                                {t.room?.room_type?.name || 'Standard'} (Floor {t.room?.floor ?? 1})
                              </span>

                              {/* Primary Task Status Badge */}
                              <Badge
                                variant={
                                  isCompleted
                                    ? 'approved'
                                    : isAwaitingInspection
                                    ? 'primary'
                                    : isInProgress
                                    ? 'pending'
                                    : 'rejected'
                                }
                                className="font-normal text-[11px]"
                              >
                                {isCompleted
                                  ? 'COMPLETED'
                                  : isAwaitingInspection
                                  ? 'AWAITING INSPECTION'
                                  : isInProgress
                                  ? 'CLEANING IN PROGRESS'
                                  : 'PENDING CLEAN'}
                              </Badge>

                              {/* Stay / Reservation Identification Pill */}
                              {reservationCode && (
                                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                                  <span>Stay:</span>
                                  <span className="font-bold">{reservationCode}</span>
                                </span>
                              )}

                              {/* Current Physical Room State */}
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-charcoal-600 border border-neutral-200">
                                Room currently: {t.room?.operational_status ?? 'UNKNOWN'}
                              </span>
                            </div>

                            <div className="text-xs text-charcoal-500 flex flex-wrap items-center gap-2 font-mono font-normal">
                              <span>Type: {t.type.replace('_', ' ')}</span>
                              {t.notes && (
                                <>
                                  <span>•</span>
                                  <span className="text-charcoal-600">{t.notes}</span>
                                </>
                              )}
                              {t.assigned_to && (
                                <>
                                  <span>•</span>
                                  <span>Cleaner: {t.assigned_to.first_name} {t.assigned_to.last_name}</span>
                                </>
                              )}
                              {t.inspected_by && (
                                <>
                                  <span>•</span>
                                  <span>Supervisor: {t.inspected_by.first_name} {t.inspected_by.last_name}</span>
                                </>
                              )}
                            </div>

                            {(t.created_at || t.started_at || t.completed_at) && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                                {t.created_at && (
                                  <span
                                    className="flex items-center gap-1 bg-neutral-100 text-charcoal-700 px-2 py-0.5 rounded border border-neutral-200"
                                    title={`Created: ${new Date(t.created_at).toLocaleString()}`}
                                  >
                                    <Clock className="w-3 h-3 text-charcoal-500" />
                                    <span>Created: {new Date(t.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </span>
                                )}
                                {t.started_at && (
                                  <span
                                    className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200"
                                    title={`Started: ${new Date(t.started_at).toLocaleString()}`}
                                  >
                                    <Play className="w-3 h-3 text-amber-600" />
                                    <span>Started: {new Date(t.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </span>
                                )}
                                {t.completed_at && (
                                  <span
                                    className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200"
                                    title={`Completed: ${new Date(t.completed_at).toLocaleString()}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Completed: {new Date(t.completed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* State Transition Action Buttons / Completed Identifier */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* If COMPLETED: Display completed badge, NO action button */}
                          {isCompleted && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Completed Stay Turnover</span>
                            </div>
                          )}

                          {/* 1. If PENDING: Start Cleaning */}
                          {isPending && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleStartCleaning(t.id)}
                              className="gap-1.5 text-xs font-normal"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Cleaning</span>
                            </Button>
                          )}

                          {/* 2. If IN_PROGRESS: Submit for Inspection */}
                          {isInProgress && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSubmitInspection(t.id)}
                              className="gap-1.5 text-xs font-normal bg-amber-600 hover:bg-amber-700"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Submit for Inspection</span>
                            </Button>
                          )}

                          {/* 3. If AWAITING_INSPECTION: Approve & Mark READY (Role-Gated) */}
                          {isAwaitingInspection && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!canApproveInspection}
                              onClick={() => handleApproveInspection(t.id)}
                              className={`gap-1.5 text-xs font-normal ${
                                canApproveInspection
                                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                                  : 'opacity-50 cursor-not-allowed bg-charcoal-400'
                              }`}
                              title={
                                canApproveInspection
                                  ? 'Approve room inspection and mark READY for check-in'
                                  : 'Supervisor inspection required (Managers, Receptionists, Admins only)'
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{canApproveInspection ? 'Approve & Mark READY' : 'Needs Supervisor'}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>

      {/* Report Maintenance Issue Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Report Room Maintenance Issue"
      >
        <form onSubmit={handleReportIssue} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-normal text-charcoal-700 mb-1">Select Room</label>
              <select
                value={issueRoomId}
                onChange={(e) => setIssueRoomId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
              >
                {allRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} (Floor {r.floor} - {r.operational_status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-normal text-charcoal-700 mb-1">Issue Title</label>
              <Input
                required
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g. Bathroom shower leak"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-charcoal-700 mb-1">Priority</label>
              <select
                value={issuePriority}
                onChange={(e) => setIssuePriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Immediate out of order)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-normal text-charcoal-700 mb-1">Details & Description</label>
              <textarea
                required
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue, water shutoff status, or replacement needs..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={issueLoading}>
              {issueLoading ? 'Submitting...' : 'Report & Block Room'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
