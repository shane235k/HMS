// apps/web/src/app/reception/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ReceptionSearchBar } from '@/components/reception/ReceptionSearchBar';
import { apiFetch, ApiError } from '@/lib/api';
import {
  CalendarDays,
  Search,
  CheckCircle2,
  LogOut,
  LogIn,
  KeyRound,
  UserCheck,
  AlertCircle,
  Clock,
  BedDouble,
  UserPlus,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Assignment {
  id: string;
  slot_index: number;
  room_id: string;
  status: string;
  room?: {
    id: string;
    room_number: string;
    floor: number;
    operational_status: string;
  };
}

interface ReservationRoom {
  id: string;
  room_type_id: string;
  rate_plan_id: string;
  quantity: number;
  room_type: { id: string; name: string; bed_type?: string };
  rate_plan?: { id: string; name: string };
  assignments: Assignment[];
}

interface Reservation {
  id: string;
  reservation_code: string;
  status: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  total_rooms: number;
  total_amount_cents: number;
  rooms: ReservationRoom[];
}

interface PhysicalRoom {
  id: string;
  room_number: string;
  floor: number;
  operational_status: string;
  room_type_id: string;
}

export default function ReceptionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'in-house' | 'search'>('arrivals');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [selectedRoomLine, setSelectedRoomLine] = useState<ReservationRoom | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [availableRooms, setAvailableRooms] = useState<PhysicalRoom[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Walk-In Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInGuestEmail, setWalkInGuestEmail] = useState('');
  const [walkInGuestPhone, setWalkInGuestPhone] = useState('');
  const [walkInRoomTypeId, setWalkInRoomTypeId] = useState('');
  const [walkInRatePlanId, setWalkInRatePlanId] = useState('');
  const [walkInNights, setWalkInNights] = useState(1);
  const [walkInTargetRoomId, setWalkInTargetRoomId] = useState('');
  const [hotelRoomTypes, setHotelRoomTypes] = useState<any[]>([]);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Sleek Calendar Schedule State
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [scheduleData, setScheduleData] = useState<
    Record<string, { checkins: number; departures: number; total: number }>
  >({});
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadSchedule = async () => {
    try {
      setScheduleLoading(true);
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const res = await apiFetch<Record<string, { checkins: number; departures: number; total: number }>>(
        `/reception/calendar-schedule?month=${monthStr}`
      );
      setScheduleData(res || {});
    } catch (err) {
      console.error('Failed to load front desk schedule:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setDateStr(today.toISOString().split('T')[0]);
  };

  const handleSelectDay = (dayKey: string) => {
    setDateStr(dayKey);
    setSearchQuery('');
    if (activeTab === 'in-house' || activeTab === 'search') {
      setActiveTab('arrivals');
    }
  };

  const formatSelectedDate = (isoStr: string) => {
    try {
      const [y, m, d] = isoStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const todayKey = new Date().toISOString().split('T')[0];

  const calendarDays = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const blanks = Array.from({ length: firstDayIndex }, (_, i) => ({
      key: `blank-${i}`,
      isCurrentMonth: false,
      dateNumber: null,
      dateKey: '',
    }));

    const days = Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return {
        key: `day-${dayNum}`,
        isCurrentMonth: true,
        dateNumber: dayNum,
        dateKey,
      };
    });

    return [...blanks, ...days];
  }, [currentMonth]);

  const monthStats = React.useMemo(() => {
    let checkins = 0;
    let departures = 0;
    Object.values(scheduleData).forEach((s) => {
      checkins += s.checkins || 0;
      departures += s.departures || 0;
    });
    return { checkins, departures, total: checkins + departures };
  }, [scheduleData]);

  const selectedDayStats = scheduleData[dateStr] || { checkins: 0, departures: 0, total: 0 };

  const loadData = async (forcedQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = forcedQuery !== undefined ? forcedQuery : searchQuery;
      if (activeTab === 'arrivals') {
        const data = await apiFetch<Reservation[]>(`/reception/arrivals?date=${dateStr}`);
        setReservations(data);
      } else if (activeTab === 'departures') {
        const data = await apiFetch<Reservation[]>(`/reception/departures?date=${dateStr}`);
        setReservations(data);
      } else if (activeTab === 'in-house') {
        const data = await apiFetch<Reservation[]>(`/reception/in-house`);
        setReservations(data);
      } else if (activeTab === 'search') {
        if (q.trim().length > 0) {
          const data = await apiFetch<Reservation[]>(`/reception/search?q=${encodeURIComponent(q.trim())}`);
          setReservations(data);
        } else {
          setReservations([]);
        }
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, dateStr]);

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setActiveTab('search');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveTab('arrivals');
  };

  const handleTabClick = (tab: 'arrivals' | 'departures' | 'in-house') => {
    setSearchQuery('');
    setActiveTab(tab);
  };

  // Open Room Assignment Modal
  const openAssignModal = async (res: Reservation, line: ReservationRoom, slotIdx: number) => {
    const resCheckInDay = res.check_in_date ? res.check_in_date.split('T')[0] : '';
    if (resCheckInDay !== todayKey) {
      setError(
        `Key assignment is strictly restricted to the scheduled arrival date (${resCheckInDay}). Current desk date is ${todayKey}.`
      );
      return;
    }

    setSelectedRes(res);
    setSelectedRoomLine(line);
    setSelectedSlotIndex(slotIdx);
    setIsAssignModalOpen(true);
    setAssignLoading(true);

    try {
      // Fetch rooms in the property
      const allRooms = await apiFetch<PhysicalRoom[]>('/management/rooms');
      // Filter rooms matching line item's room type
      const matchingRooms = allRooms.filter((r) => r.room_type_id === line.room_type_id);
      setAvailableRooms(matchingRooms);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rooms for assignment');
    } finally {
      setAssignLoading(false);
    }
  };

  // Execute Room Assignment
  const handleAssignRoom = async (roomId: string) => {
    if (!selectedRes || !selectedRoomLine) return;
    const resCheckInDay = selectedRes.check_in_date ? selectedRes.check_in_date.split('T')[0] : '';
    if (resCheckInDay !== todayKey) {
      setError(
        `Key assignment is strictly restricted to the scheduled arrival date (${resCheckInDay}). Current desk date is ${todayKey}.`
      );
      setIsAssignModalOpen(false);
      return;
    }

    setAssignLoading(true);
    try {
      await apiFetch(`/reception/reservations/${selectedRes.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          reservationRoomId: selectedRoomLine.id,
          slotIndex: selectedSlotIndex,
          roomId,
        }),
      });
      setActionSuccess(`Room assigned successfully to Slot ${selectedSlotIndex + 1}!`);
      setIsAssignModalOpen(false);
      await loadData();
      await loadSchedule();
    } catch (err: any) {
      setError(err.message || 'Failed to assign room');
    } finally {
      setAssignLoading(false);
    }
  };

  // Execute Check-In
  const handleCheckIn = async (reservationId: string) => {
    setError(null);
    setActionSuccess(null);

    const targetRes = reservations.find((r) => r.id === reservationId);
    const resCheckInDay = targetRes?.check_in_date ? targetRes.check_in_date.split('T')[0] : '';
    if (resCheckInDay && resCheckInDay !== todayKey) {
      setError(
        `Guest check-in and key handover are strictly restricted to the scheduled arrival date (${resCheckInDay}). Today is ${todayKey}.`
      );
      return;
    }

    try {
      await apiFetch(`/reception/reservations/${reservationId}/check-in`, {
        method: 'POST',
      });
      setActionSuccess('Guest checked in successfully! Rooms marked OCCUPIED.');
      await loadData();
      await loadSchedule();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Check-in failed');
    }
  };

  // Execute Check-Out
  const handleCheckOut = async (reservationId: string) => {
    setError(null);
    setActionSuccess(null);
    try {
      const res = await apiFetch<any>(`/reception/reservations/${reservationId}/check-out`, {
        method: 'POST',
      });
      setActionSuccess(
        `Guest checked out! ${res.housekeepingTasksCreated} turnover clean task(s) generated for housekeeping.`
      );
      await loadData();
      await loadSchedule();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Check-out failed');
    }
  };

  // Open Walk-In Modal
  const openWalkInModal = async () => {
    setWalkInError(null);
    setIsWalkInModalOpen(true);
    try {
      const roomTypes = await apiFetch<any[]>('/management/room-types');
      setHotelRoomTypes(roomTypes);
      if (roomTypes.length > 0) {
        setWalkInRoomTypeId(roomTypes[0].id);
        if (roomTypes[0].rate_plans?.length > 0) {
          setWalkInRatePlanId(roomTypes[0].rate_plans[0].id);
        }
      }
    } catch (err: any) {
      setWalkInError(err.message || 'Failed to load room types');
    }
  };

  // Submit Walk-In Booking
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInLoading(true);
    setWalkInError(null);

    const today = new Date();
    const inDateStr = today.toISOString().split('T')[0];
    const outDate = new Date(today.getTime() + walkInNights * 24 * 60 * 60 * 1000);
    const outDateStr = outDate.toISOString().split('T')[0];

    try {
      await apiFetch('/reception/walk-in', {
        method: 'POST',
        body: JSON.stringify({
          checkInDate: inDateStr,
          checkOutDate: outDateStr,
          guestName: walkInGuestName,
          guestEmail: walkInGuestEmail,
          guestPhone: walkInGuestPhone || undefined,
          rooms: [
            {
              roomTypeId: walkInRoomTypeId,
              ratePlanId: walkInRatePlanId,
              quantity: 1,
            },
          ],
          assignedRoomIds: walkInTargetRoomId ? [walkInTargetRoomId] : undefined,
        }),
      });

      setActionSuccess(`Walk-in confirmed for ${walkInGuestName}!`);
      setIsWalkInModalOpen(false);
      await loadData();
      await loadSchedule();
    } catch (err: any) {
      setWalkInError(err instanceof ApiError ? err.message : 'Failed to create walk-in reservation');
    } finally {
      setWalkInLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">Front Desk Operations</h1>
            <Badge variant="primary" className="text-[11px] font-normal">
              Live Reception Desk
            </Badge>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <Button
              variant="primary"
              size="sm"
              onClick={openWalkInModal}
              className="gap-1.5 text-xs font-normal shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Walk-In Booking</span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadData();
                loadSchedule();
              }}
              className="gap-1.5 text-xs font-normal"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 max-w-[1700px] w-full">
          {/* Notifications */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-normal">{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-normal text-sm">
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-normal">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 font-normal text-sm">
                ×
              </button>
            </div>
          )}

          {/* Main 2-Column Responsive Layout: Left = Operations / List, Right = Sleek Front Desk Calendar */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Operational Column */}
            <div className="xl:col-span-8 2xl:col-span-8 space-y-5">
              {/* Always Visible Reception Search Bar */}
              <ReceptionSearchBar
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
                onSearch={(q) => executeSearch(q)}
                onClear={handleClearSearch}
                loading={loading && activeTab === 'search'}
                totalResults={activeTab === 'search' ? reservations.length : null}
                isSearchActive={activeTab === 'search'}
              />

              {/* Navigation Tabs & Active Date Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-charcoal-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTabClick('arrivals')}
                    className={`px-4 py-2 rounded-lg text-xs font-normal transition-all ${
                      activeTab === 'arrivals'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-charcoal-600 hover:bg-canvas-neutral'
                    }`}
                  >
                    Arrivals
                  </button>
                  <button
                    onClick={() => handleTabClick('departures')}
                    className={`px-4 py-2 rounded-lg text-xs font-normal transition-all ${
                      activeTab === 'departures'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-charcoal-600 hover:bg-canvas-neutral'
                    }`}
                  >
                    Departures
                  </button>
                  <button
                    onClick={() => handleTabClick('in-house')}
                    className={`px-4 py-2 rounded-lg text-xs font-normal transition-all ${
                      activeTab === 'in-house'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-charcoal-600 hover:bg-canvas-neutral'
                    }`}
                  >
                    In-House
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {(activeTab === 'arrivals' || activeTab === 'departures') && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs text-charcoal-700">
                      <Calendar className="w-3.5 h-3.5 text-charcoal-500" />
                      <span>
                        Active: <span className="text-black font-normal">{formatSelectedDate(dateStr)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reservations List */}
              {loading ? (
                <div className="h-64 rounded-xl bg-white border border-charcoal-200 animate-pulse flex items-center justify-center text-charcoal-400 text-xs">
                  Loading Front Desk Records...
                </div>
              ) : reservations.length === 0 ? (
                <Card className="p-12 text-center bg-white border-charcoal-200">
                  <CalendarDays className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-charcoal-900">No Reservations Found</h3>
                  <p className="text-xs text-charcoal-500 max-w-sm mx-auto mt-1">
                    {activeTab === 'arrivals' && 'No arrivals expected for the selected date.'}
                    {activeTab === 'departures' && 'No departures scheduled for the selected date.'}
                    {activeTab === 'in-house' && 'No guests are currently checked into rooms.'}
                    {activeTab === 'search' && 'No reservations match your search terms.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reservations.map((res) => {
                    // Calculate readiness
                    const allRoomsAssigned = res.rooms.every((r) => r.assignments?.length >= r.quantity);
                    const allRoomsReady = res.rooms.every((r) =>
                      r.assignments?.every((a) => a.room?.operational_status === 'READY')
                    );
                    const resCheckInDay = res.check_in_date ? res.check_in_date.split('T')[0] : '';
                    const isArrivalToday = resCheckInDay === todayKey;
                    const isFutureArrival = resCheckInDay > todayKey;

                    return (
                      <Card key={res.id} className="p-5 bg-white border-charcoal-200 shadow-sm hover:border-neutral-200 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Guest & Reference Details */}
                          <div className="space-y-1.5 min-w-[280px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                                {res.reservation_code}
                              </span>
                              <Badge
                                variant={
                                  res.status === 'CONFIRMED'
                                    ? 'approved'
                                    : res.status === 'CHECKED_IN'
                                    ? 'primary'
                                    : res.status === 'CHECKED_OUT'
                                    ? 'neutral'
                                    : 'pending'
                                }
                              >
                                {res.status.replace('_', ' ')}
                              </Badge>

                              {/* Scheduled Arrival Indicator */}
                              {res.status === 'CONFIRMED' && (
                                isArrivalToday ? (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Arrival Today
                                  </span>
                                ) : isFutureArrival ? (
                                  <span
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200"
                                    title={`Scheduled arrival on ${resCheckInDay}. Key assignment locked until check-in date.`}
                                  >
                                    Scheduled: {resCheckInDay}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
                                    Scheduled: {resCheckInDay}
                                  </span>
                                )
                              )}
                            </div>

                            <h3 className="text-base font-bold text-charcoal-900">{res.guest_name}</h3>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-charcoal-400" />
                                {res.guest_email}
                              </span>
                              {res.guest_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                                  {res.guest_phone}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-charcoal-600 font-mono">
                              Stay: {res.check_in_date?.split('T')[0]} → {res.check_out_date?.split('T')[0]} ({res.total_nights} nights)
                            </div>
                          </div>

                          {/* Room & Assignment Slot Status */}
                          <div className="flex-1 space-y-2 border-t lg:border-t-0 lg:border-l border-charcoal-100 lg:pl-6 pt-3 lg:pt-0">
                            <div className="text-xs font-semibold text-charcoal-700">Room Category & Slot Assignments:</div>
                            <div className="space-y-2">
                              {res.rooms.map((line) => (
                                <div key={line.id} className="p-3 rounded-lg bg-canvas-neutral border border-charcoal-200 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-charcoal-900">
                                      {line.room_type?.name} ({line.quantity} room{line.quantity > 1 ? 's' : ''})
                                    </span>
                                    <span className="text-[11px] text-charcoal-500 font-mono">
                                      {line.rate_plan?.name}
                                    </span>
                                  </div>

                                  {/* Slots for this line item */}
                                  <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: line.quantity }).map((_, slotIdx) => {
                                      const assignment = line.assignments?.find((a) => a.slot_index === slotIdx);
                                      const assignedRoom = assignment?.room;

                                      return (
                                        <div
                                          key={slotIdx}
                                          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-charcoal-200 text-xs shadow-xs"
                                        >
                                          <span className="text-[11px] font-mono text-charcoal-400">
                                            Slot {slotIdx + 1}:
                                          </span>
                                          {assignedRoom ? (
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-charcoal-900">
                                                Room {assignedRoom.room_number}
                                              </span>
                                              <Badge
                                                variant={
                                                  assignedRoom.operational_status === 'READY'
                                                    ? 'approved'
                                                    : assignedRoom.operational_status === 'OCCUPIED'
                                                    ? 'primary'
                                                    : 'rejected'
                                                }
                                                className="text-[10px] px-1.5 py-0"
                                              >
                                                {assignedRoom.operational_status}
                                              </Badge>
                                              {res.status === 'CONFIRMED' && (
                                                isArrivalToday ? (
                                                  <button
                                                    onClick={() => openAssignModal(res, line, slotIdx)}
                                                    className="text-[10px] text-black underline font-normal hover:text-neutral-600 ml-1"
                                                    title="Change room assignment"
                                                  >
                                                    Change
                                                  </button>
                                                ) : (
                                                  <span
                                                    className="text-[10px] text-neutral-400 font-mono ml-1"
                                                    title={`Key reassignment locked until scheduled check-in date (${resCheckInDay}). Today is ${todayKey}.`}
                                                  >
                                                    Locked
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-charcoal-400 italic">Unassigned</span>
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={!isArrivalToday}
                                                onClick={() => openAssignModal(res, line, slotIdx)}
                                                className="text-[11px] h-6 px-2 py-0 ml-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200"
                                                title={
                                                  !isArrivalToday
                                                    ? `Key assignment is strictly restricted to scheduled arrival date (${resCheckInDay || 'N/A'}). Today is ${todayKey}.`
                                                    : 'Assign physical room to this slot'
                                                }
                                              >
                                                <KeyRound className="w-3 h-3 mr-1" />
                                                Assign
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-3 lg:pt-0">
                            {res.status === 'CONFIRMED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={!isArrivalToday || !allRoomsAssigned || !allRoomsReady}
                                onClick={() => handleCheckIn(res.id)}
                                className="w-full lg:w-36 gap-1.5 text-xs font-normal shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                title={
                                  !isArrivalToday
                                    ? `Check-in and key handover are only permitted on the scheduled arrival date (${resCheckInDay || 'N/A'}). Today is ${todayKey}.`
                                    : !allRoomsAssigned
                                    ? 'All physical rooms must be assigned before check-in'
                                    : !allRoomsReady
                                    ? 'Assigned rooms must be in READY status for check-in'
                                    : 'Complete guest check-in & handover keys'
                                }
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Handover Key & In</span>
                              </Button>
                            )}

                            {res.status === 'CHECKED_IN' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCheckOut(res.id)}
                                className="w-full lg:w-36 gap-1.5 text-xs font-normal text-charcoal-800 hover:bg-charcoal-100"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Check-Out Guest</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Sleek Front Desk Interactive Calendar */}
            <div className="xl:col-span-4 2xl:col-span-4 space-y-4">
              <Card className="p-5 bg-white border-charcoal-200 shadow-sm rounded-xl">
                {/* Calendar Header */}
                <div className="flex items-center justify-between pb-4 border-b border-charcoal-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-charcoal-700" />
                    <span className="text-sm font-normal text-black capitalize">
                      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg border border-charcoal-200 bg-white hover:bg-neutral-100 text-charcoal-700 transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-2.5 py-1 rounded-lg border border-charcoal-200 bg-white hover:bg-neutral-100 text-[11px] font-normal text-charcoal-700 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg border border-charcoal-200 bg-white hover:bg-neutral-100 text-charcoal-700 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day of Week Labels */}
                <div className="grid grid-cols-7 gap-1 pt-4 pb-2 text-center">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="text-[11px] font-normal text-charcoal-400 py-0.5">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Month Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((cell) => {
                    if (!cell.isCurrentMonth || cell.dateNumber === null) {
                      return <div key={cell.key} className="aspect-square w-full" />;
                    }

                    const dayKey = cell.dateKey;
                    const stats = scheduleData[dayKey] || { checkins: 0, departures: 0, total: 0 };
                    const isSelected = dateStr === dayKey;
                    const isToday = todayKey === dayKey;
                    const hasEvents = stats.total > 0;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => handleSelectDay(dayKey)}
                        className={`relative aspect-square w-full rounded-lg border text-xs font-normal flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-sm'
                            : isToday
                            ? 'border-neutral-900 bg-neutral-50 text-black'
                            : 'border-charcoal-150 bg-white hover:bg-neutral-50 hover:border-charcoal-300 text-charcoal-800'
                        }`}
                        title={`${formatSelectedDate(dayKey)}: ${stats.checkins} check-in(s), ${stats.departures} departure(s)`}
                      >
                        {/* Day number */}
                        <span className="leading-none">{cell.dateNumber}</span>

                        {/* Top Right Corner Badge for Checkins + Departures */}
                        {hasEvents && (
                          <span
                            className={`absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-normal flex items-center justify-center leading-none shadow-xs ${
                              isSelected
                                ? 'bg-white text-black'
                                : 'bg-black text-white'
                            }`}
                          >
                            {stats.total}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Inspector */}
                <div className="mt-5 pt-4 border-t border-charcoal-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-normal">
                      <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                      <span>Selected Date</span>
                    </div>
                    <span className="text-xs font-normal text-black font-mono">
                      {formatSelectedDate(dateStr)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('arrivals')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        activeTab === 'arrivals'
                          ? 'border-black bg-neutral-100'
                          : 'border-charcoal-200 bg-canvas-neutral hover:bg-white'
                      }`}
                    >
                      <div className="text-[10px] text-charcoal-500 flex items-center justify-between font-normal">
                        <span>Check-Ins</span>
                        <LogIn className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="text-base font-normal text-black font-mono mt-0.5">
                        {selectedDayStats.checkins}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('departures')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        activeTab === 'departures'
                          ? 'border-black bg-neutral-100'
                          : 'border-charcoal-200 bg-canvas-neutral hover:bg-white'
                      }`}
                    >
                      <div className="text-[10px] text-charcoal-500 flex items-center justify-between font-normal">
                        <span>Departures</span>
                        <LogOut className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="text-base font-normal text-black font-mono mt-0.5">
                        {selectedDayStats.departures}
                      </div>
                    </button>
                  </div>

                  {/* Operational Summary */}
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-charcoal-100 text-[11px] text-charcoal-600 flex items-center justify-between font-normal">
                    <span>Combined Movements:</span>
                    <span className="font-normal font-mono text-black">
                      {selectedDayStats.total} guest(s)
                    </span>
                  </div>
                </div>

                {/* Monthly Activity Footnote */}
                <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between text-[11px] text-charcoal-500 font-normal">
                  <span>Month Front Desk Activity:</span>
                  <span className="font-normal font-mono text-black">
                    {monthStats.checkins} in / {monthStats.departures} out
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Room Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Physical Room — Slot ${selectedSlotIndex + 1}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Assign a physical room for category{' '}
            <strong className="text-charcoal-900">{selectedRoomLine?.room_type?.name}</strong>.
            Rooms must be active and not under maintenance blocks.
          </p>

          {assignLoading ? (
            <div className="p-8 text-center text-xs text-charcoal-400 animate-pulse">
              Loading available rooms...
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {availableRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-charcoal-200 bg-white hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center font-normal font-mono text-black text-sm">
                      {r.room_number}
                    </div>
                    <div>
                      <div className="text-xs font-normal text-charcoal-900">Floor {r.floor}</div>
                      <Badge
                        variant={
                          r.operational_status === 'READY'
                            ? 'approved'
                            : r.operational_status === 'OCCUPIED'
                            ? 'primary'
                            : 'rejected'
                        }
                        className="text-[10px] font-normal"
                      >
                        {r.operational_status}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant={r.operational_status === 'READY' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleAssignRoom(r.id)}
                    className="text-xs font-normal"
                  >
                    Select Room
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Walk-In Modal */}
      <Modal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        title="Create Walk-In Reservation"
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          {walkInError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-normal">
              {walkInError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-normal text-charcoal-700 mb-1">Guest Full Name</label>
              <Input
                required
                value={walkInGuestName}
                onChange={(e) => setWalkInGuestName(e.target.value)}
                placeholder="e.g. Claire Delacroix"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-normal text-charcoal-700 mb-1">Guest Email</label>
                <Input
                  type="email"
                  required
                  value={walkInGuestEmail}
                  onChange={(e) => setWalkInGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-charcoal-700 mb-1">Phone (Optional)</label>
                <Input
                  value={walkInGuestPhone}
                  onChange={(e) => setWalkInGuestPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-normal text-charcoal-700 mb-1">Room Category</label>
                <select
                  value={walkInRoomTypeId}
                  onChange={(e) => {
                    setWalkInRoomTypeId(e.target.value);
                    const rt = hotelRoomTypes.find((x) => x.id === e.target.value);
                    if (rt?.rate_plans?.length > 0) {
                      setWalkInRatePlanId(rt.rate_plans[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
                >
                  {hotelRoomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-normal text-charcoal-700 mb-1">Nights</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={walkInNights}
                  onChange={(e) => setWalkInNights(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWalkInModalOpen(false)}
              className="font-normal"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={walkInLoading}
              className="font-normal"
            >
              {walkInLoading ? 'Booking...' : 'Confirm Walk-In'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
