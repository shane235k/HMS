// apps/web/src/app/manage/inventory/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, ApiError } from '@/lib/api';
import { OperationalStatus } from '@hbms/shared';
import { OperationalRingChart } from '@/components/dashboard/OperationalRingChart';
import { CreateRoomTypeView } from '@/components/dashboard/CreateRoomTypeView';
import {
  BedDouble,
  Layers,
  Wrench,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Edit2,
  ShieldAlert,
  ArrowRight,
  Filter,
  Calendar,
  Info,
} from 'lucide-react';

function ManagerInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingType, setIsCreatingType] = useState(() => searchParams?.get('new') === 'true');
  const [editingType, setEditingType] = useState<any | null>(null);

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      setIsCreatingType(true);
      setEditingType(null);
    }
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<'types' | 'rooms' | 'blocks'>('types');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    const editId = searchParams?.get('edit');
    if (editId && roomTypes.length > 0) {
      const match = roomTypes.find((rt) => rt.id === editId);
      if (match) {
        setEditingType(match);
        setIsCreatingType(false);
      }
    }
  }, [searchParams, roomTypes]);

  // Modals state
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any | null>(null);

  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isCreateBlockModalOpen, setIsCreateBlockModalOpen] = useState(false);
  const [selectedRoomForBlock, setSelectedRoomForBlock] = useState<string>('');

  // Form states: Room Type
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeMaxGuests, setTypeMaxGuests] = useState('2');
  const [typeMaxAdults, setTypeMaxAdults] = useState('2');
  const [typeMaxChildren, setTypeMaxChildren] = useState('1');
  const [typeBedType, setTypeBedType] = useState('1 King Bed');
  const [typeSizeSqm, setTypeSizeSqm] = useState('45');
  const [typeAmenities, setTypeAmenities] = useState('High-Speed Wi-Fi, Balcony, Minibar');
  const [typeBasePrice, setTypeBasePrice] = useState('25000');
  const [typeActionLoading, setTypeActionLoading] = useState(false);
  const [typeModalError, setTypeModalError] = useState<string | null>(null);

  // Form states: Physical Room
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');
  const [roomTypeIdForRoom, setRoomTypeIdForRoom] = useState('');
  const [roomInitialStatus, setRoomInitialStatus] = useState<OperationalStatus>(OperationalStatus.READY);
  const [roomActionLoading, setRoomActionLoading] = useState(false);
  const [roomModalError, setRoomModalError] = useState<string | null>(null);

  // Form states: Maintenance Block
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('HVAC Maintenance and Deep Cleaning');
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [blockModalError, setBlockModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [typesData, roomsData, blocksData] = await Promise.all([
        apiFetch<any[]>('/management/room-types'),
        apiFetch<any[]>('/management/rooms'),
        apiFetch<any[]>('/management/blocks'),
      ]);
      setRoomTypes(typesData || []);
      setRooms(roomsData || []);
      setBlocks(blocksData || []);
      if (typesData && typesData.length > 0 && !roomTypeIdForRoom) {
        setRoomTypeIdForRoom(typesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: Create Room Type
  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeActionLoading(true);
    setTypeModalError(null);
    try {
      const amenitiesList = typeAmenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const basePriceCents = Math.round(parseFloat(typeBasePrice || '0') * 100);

      await apiFetch('/management/room-types', {
        method: 'POST',
        body: JSON.stringify({
          name: typeName,
          description: typeDescription,
          maxGuests: parseInt(typeMaxGuests, 10),
          maxAdults: parseInt(typeMaxAdults, 10),
          maxChildren: parseInt(typeMaxChildren, 10),
          bedType: typeBedType,
          roomSizeSqm: parseFloat(typeSizeSqm || '0'),
          amenities: amenitiesList,
          basePriceCents: basePriceCents > 0 ? basePriceCents : undefined,
        }),
      });

      setIsCreateTypeModalOpen(false);
      resetTypeForm();
      await loadData();
    } catch (err: any) {
      setTypeModalError(err.message || 'Failed to create room type');
    } finally {
      setTypeActionLoading(false);
    }
  };

  // Handler: Toggle Room Type Status
  const handleToggleRoomTypeStatus = async (typeId: string, currentActive: boolean) => {
    try {
      await apiFetch(`/management/room-types/${typeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Handler: Create Physical Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomActionLoading(true);
    setRoomModalError(null);
    try {
      await apiFetch('/management/rooms', {
        method: 'POST',
        body: JSON.stringify({
          roomNumber,
          floor: parseInt(roomFloor, 10),
          roomTypeId: roomTypeIdForRoom,
          operationalStatus: roomInitialStatus,
        }),
      });

      setIsCreateRoomModalOpen(false);
      setRoomNumber('');
      await loadData();
    } catch (err: any) {
      setRoomModalError(err.message || 'Failed to create room');
    } finally {
      setRoomActionLoading(false);
    }
  };

  // Handler: Update Room Status
  const handleUpdateRoomStatus = async (roomId: string, newStatus: OperationalStatus) => {
    try {
      await apiFetch(`/management/rooms/${roomId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ operationalStatus: newStatus }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update room status');
    }
  };

  // Handler: Create Maintenance Block
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBlock) {
      setBlockModalError('Please select a room to block');
      return;
    }
    setBlockActionLoading(true);
    setBlockModalError(null);
    try {
      await apiFetch(`/management/rooms/${selectedRoomForBlock}/blocks`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: blockStartDate,
          endDate: blockEndDate,
          reason: blockReason,
        }),
      });

      setIsCreateBlockModalOpen(false);
      setBlockStartDate('');
      setBlockEndDate('');
      await loadData();
    } catch (err: any) {
      setBlockModalError(err.message || 'Failed to create maintenance block');
    } finally {
      setBlockActionLoading(false);
    }
  };

  // Handler: Delete Maintenance Block
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to release this maintenance block?')) return;
    try {
      await apiFetch(`/management/blocks/${blockId}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove block');
    }
  };

  const handleOpenEditType = (rt: any) => {
    setEditingType(rt);
    setIsCreatingType(false);
  };

  const handleSaveEditType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    try {
      setTypeActionLoading(true);
      setTypeModalError(null);
      const amenitiesList = typeAmenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await apiFetch(`/management/room-types/${selectedType.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: typeName.trim(),
          description: typeDescription.trim(),
          maxGuests: parseInt(typeMaxGuests, 10),
          maxAdults: parseInt(typeMaxAdults, 10),
          maxChildren: parseInt(typeMaxChildren, 10),
          bedType: typeBedType.trim(),
          roomSizeSqm: parseFloat(typeSizeSqm || '0'),
          amenities: amenitiesList,
        }),
      });

      setIsEditTypeModalOpen(false);
      setSelectedType(null);
      await loadData();
    } catch (err: any) {
      setTypeModalError(err.message || 'Failed to update room type');
    } finally {
      setTypeActionLoading(false);
    }
  };

  const resetTypeForm = () => {
    setTypeName('');
    setTypeDescription('');
    setTypeMaxGuests('2');
    setTypeMaxAdults('2');
    setTypeMaxChildren('1');
    setTypeBedType('1 King Bed');
    setTypeSizeSqm('45');
    setTypeAmenities('High-Speed Wi-Fi, Balcony, Minibar');
    setTypeBasePrice('25000');
  };

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case OperationalStatus.READY:
        return <Badge className="bg-black text-white border-black font-normal">READY</Badge>;
      case OperationalStatus.OCCUPIED:
        return <Badge className="bg-[#333333] text-white border-[#333333] font-normal">OCCUPIED</Badge>;
      case OperationalStatus.DIRTY:
        return <Badge className="bg-[#555555] text-white border-[#555555] font-normal">DIRTY</Badge>;
      case OperationalStatus.CLEANING:
        return <Badge className="bg-[#777777] text-white border-[#777777] font-normal">CLEANING</Badge>;
      case OperationalStatus.INSPECTION:
        return <Badge className="bg-[#999999] text-white border-[#999999] font-normal">INSPECTION</Badge>;
      case OperationalStatus.MAINTENANCE:
        return <Badge className="bg-[#CCCCCC] text-neutral-900 border-[#CCCCCC] font-normal">MAINTENANCE</Badge>;
      default:
        return <Badge variant="neutral" className="font-normal">{status}</Badge>;
    }
  };

  // Compute operational lifecycle counts and percentages
  const totalPhysicalRooms = rooms.length;
  const readyCount = rooms.filter((r) => r.operational_status === OperationalStatus.READY).length;
  const occupiedCount = rooms.filter((r) => r.operational_status === OperationalStatus.OCCUPIED).length;
  const dirtyCount = rooms.filter((r) => r.operational_status === OperationalStatus.DIRTY).length;
  const cleaningCount = rooms.filter((r) => r.operational_status === OperationalStatus.CLEANING).length;
  const inspectionCount = rooms.filter((r) => r.operational_status === OperationalStatus.INSPECTION).length;
  const maintenanceCount = rooms.filter((r) => r.operational_status === OperationalStatus.MAINTENANCE).length;

  const floorMaintenanceRooms = rooms.filter((r) => r.operational_status === OperationalStatus.MAINTENANCE);

  const getPercentage = (count: number) => {
    if (totalPhysicalRooms === 0) return 0;
    return Math.round((count / totalPhysicalRooms) * 100);
  };

  const operationalItems = [
    {
      key: OperationalStatus.READY,
      label: 'Ready for Guests',
      count: readyCount,
      percentage: getPercentage(readyCount),
      hexColor: '#000000',
      dotColor: 'bg-black',
    },
    {
      key: OperationalStatus.OCCUPIED,
      label: 'Occupied (In-House)',
      count: occupiedCount,
      percentage: getPercentage(occupiedCount),
      hexColor: '#333333',
      dotColor: 'bg-[#333333]',
    },
    {
      key: OperationalStatus.DIRTY,
      label: 'Dirty (Turnover Needed)',
      count: dirtyCount,
      percentage: getPercentage(dirtyCount),
      hexColor: '#555555',
      dotColor: 'bg-[#555555]',
    },
    {
      key: OperationalStatus.CLEANING,
      label: 'Cleaning in Progress',
      count: cleaningCount,
      percentage: getPercentage(cleaningCount),
      hexColor: '#777777',
      dotColor: 'bg-[#777777]',
    },
    {
      key: OperationalStatus.INSPECTION,
      label: 'Pending Inspection',
      count: inspectionCount,
      percentage: getPercentage(inspectionCount),
      hexColor: '#999999',
      dotColor: 'bg-[#999999]',
    },
    {
      key: OperationalStatus.MAINTENANCE,
      label: 'Floor Maintenance / Repair',
      count: maintenanceCount,
      percentage: getPercentage(maintenanceCount),
      hexColor: '#CCCCCC',
      dotColor: 'bg-[#CCCCCC]',
    },
  ];

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {isCreatingType || editingType ? (
            <CreateRoomTypeView
              initialData={editingType}
              onCancel={() => {
                setIsCreatingType(false);
                setEditingType(null);
                if (searchParams?.get('new') || searchParams?.get('edit')) {
                  router.replace('/manage/inventory');
                }
              }}
              onSuccess={async () => {
                setIsCreatingType(false);
                setEditingType(null);
                if (searchParams?.get('new') || searchParams?.get('edit')) {
                  router.replace('/manage/inventory');
                }
                await loadData();
              }}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-charcoal-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-normal uppercase tracking-wider text-black bg-neutral-100 px-2 py-0.5 rounded">
                      PMS Inventory Module
                    </span>
                  </div>
                  <h1 className="text-3xl font-normal text-charcoal-900 font-sans tracking-tight mt-1">
                    Room Inventory & Capacity
                  </h1>
                  <p className="text-sm text-charcoal-600 mt-1 font-normal">
                    Configure room categories, physical inventory, operational turnover states, and date-aware maintenance blocks.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {activeTab === 'types' && (
                    <Button
                      onClick={() => {
                        setEditingType(null);
                        setIsCreatingType(true);
                      }}
                      className="gap-2 font-normal"
                    >
                      <Plus className="w-4 h-4" /> Add Room Type
                    </Button>
                  )}
                  {activeTab === 'rooms' && (
                    <Button onClick={() => setIsCreateRoomModalOpen(true)} className="gap-2 font-normal">
                      <Plus className="w-4 h-4" /> Add Physical Room
                    </Button>
                  )}
                  {activeTab === 'blocks' && (
                    <Button
                      onClick={() => {
                        if (rooms.length > 0) setSelectedRoomForBlock(rooms[0].id);
                        setIsCreateBlockModalOpen(true);
                      }}
                      className="gap-2 font-normal"
                    >
                      <Wrench className="w-4 h-4" /> Schedule Block
                    </Button>
                  )}
                </div>
              </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3 font-normal">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main 2-Column Layout: Left Vertical Metrics, Right Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Vertical Side Component with Ring Graph & Numbers (Col-span 3) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Card 1: Operational Turnover Lifecycle Ring Graph */}
              <Card className="border border-charcoal-200 bg-white shadow-sm p-4">
                <OperationalRingChart
                  title="Physical Rooms Lifecycle"
                  subtitle="Real-time operational turnover states on property floor"
                  totalRooms={totalPhysicalRooms}
                  items={operationalItems}
                  layout="stacked"
                />
              </Card>

              {/* Card 2: Room Category Distribution */}
              <Card className="border border-charcoal-200 bg-white shadow-sm">
                <CardHeader className="pb-3 border-b border-charcoal-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-normal text-charcoal-900 uppercase font-mono tracking-wider">
                      Room Types Distribution
                    </CardTitle>
                    <span className="text-xs font-mono font-normal text-charcoal-500">
                      {roomTypes.length} Types
                    </span>
                  </div>
                  <CardDescription className="text-xs font-normal text-charcoal-500 mt-0.5">
                    Physical chambers allocated per category
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {roomTypes.length === 0 ? (
                    <p className="text-xs text-charcoal-400 font-normal">No room types configured</p>
                  ) : (
                    roomTypes.map((rt) => {
                      const count = rt._count?.rooms || 0;
                      const pct = totalPhysicalRooms > 0 ? Math.round((count / totalPhysicalRooms) * 100) : 0;
                      return (
                        <div key={rt.id}>
                          <div className="flex items-center justify-between text-xs font-normal text-charcoal-700 mb-1">
                            <span className="truncate max-w-[170px]" title={rt.name}>
                              {rt.name}
                            </span>
                            <span className="font-mono text-charcoal-900">
                              {count} / {totalPhysicalRooms} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Summary Counter Card */}
              <Card className="border border-charcoal-200 bg-white shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-charcoal-100">
                    <span className="text-xs font-mono uppercase text-charcoal-500 font-normal">
                      Overall Readiness Score
                    </span>
                    <span className="text-sm font-mono text-neutral-900 font-normal">
                      {getPercentage(readyCount)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-charcoal-500 font-normal">
                      Scheduled Calendar Blocks
                    </span>
                    <span className="text-sm font-mono text-neutral-900 font-normal">
                      {blocks.length} active
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Navigation Tabs & Tab Content (Col-span 9) */}
            <div className="lg:col-span-9 space-y-6">
              {/* Navigation Tabs */}
              <div className="flex border-b border-charcoal-200 gap-6">
                <button
                  onClick={() => setActiveTab('types')}
                  className={`pb-3 font-normal text-sm transition-colors border-b-2 ${
                    activeTab === 'types'
                      ? 'border-black text-black'
                      : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Room Types ({roomTypes.length})
                </button>
                <button
                  onClick={() => setActiveTab('rooms')}
                  className={`pb-3 font-normal text-sm transition-colors border-b-2 ${
                    activeTab === 'rooms'
                      ? 'border-black text-black'
                      : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Physical Rooms ({rooms.length})
                </button>
                <button
                  onClick={() => setActiveTab('blocks')}
                  className={`pb-3 font-normal text-sm transition-colors border-b-2 ${
                    activeTab === 'blocks'
                      ? 'border-black text-black'
                      : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Maintenance Blocks ({blocks.length})
                </button>
              </div>

              {/* TAB 1: ROOM TYPES */}
              {activeTab === 'types' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="p-12 text-center text-charcoal-500 font-normal">Loading room categories...</div>
                  ) : roomTypes.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <BedDouble className="w-12 h-12 text-charcoal-300 mx-auto mb-3" />
                        <h3 className="text-lg font-normal text-charcoal-800">No room types configured</h3>
                        <p className="text-sm text-charcoal-500 max-w-md mx-auto mt-1 mb-4 font-normal">
                          Create room types (e.g. Deluxe Suite, Ocean View) to establish base capacities and commercial pricing.
                        </p>
                        <Button onClick={() => setIsCreatingType(true)} className="font-normal">
                          Add First Room Type
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {roomTypes.map((rt) => (
                        <Card key={rt.id} className="overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="h-40 bg-charcoal-100 relative overflow-hidden flex items-center justify-center">
                              {rt.images && rt.images.length > 0 ? (
                                <img src={rt.images[0]} alt={rt.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center text-charcoal-400">
                                  <BedDouble className="w-10 h-10 mx-auto opacity-40" />
                                  <span className="text-xs font-mono mt-1 block font-normal">No Image</span>
                                </div>
                              )}
                              <div className="absolute top-3 right-3">
                                <Badge variant={rt.is_active ? 'success' : 'neutral'}>
                                  {rt.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                              </div>
                            </div>

                            <CardContent className="p-5 space-y-3">
                              <div>
                                <h3 className="text-lg font-normal text-charcoal-900 font-sans">{rt.name}</h3>
                                <p className="text-xs text-charcoal-500 font-mono font-normal">Slug: {rt.slug}</p>
                              </div>

                              <p className="text-xs text-charcoal-600 line-clamp-2 font-normal">
                                {rt.description || 'No description provided.'}
                              </p>

                              <div className="flex flex-wrap gap-2 text-xs font-normal text-charcoal-700 pt-2 border-t border-charcoal-100">
                                <span className="bg-canvas-neutral px-2 py-1 rounded">
                                  Max {rt.max_guests} Guests ({rt.max_adults}A, {rt.max_children}C)
                                </span>
                                <span className="bg-canvas-neutral px-2 py-1 rounded">{rt.bed_type}</span>
                                {rt.room_size_sqm && (
                                  <span className="bg-canvas-neutral px-2 py-1 rounded">{rt.room_size_sqm} m²</span>
                                )}
                              </div>

                              {rt.amenities && rt.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {rt.amenities.slice(0, 3).map((a: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] font-mono bg-neutral-100 text-black px-2 py-0.5 rounded-full font-normal"
                                    >
                                      {a}
                                    </span>
                                  ))}
                                  {rt.amenities.length > 3 && (
                                    <span className="text-[10px] font-mono text-charcoal-500 self-center font-normal">
                                      +{rt.amenities.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </div>

                          <div className="p-4 bg-canvas-neutral border-t border-charcoal-100 flex items-center justify-between text-xs">
                            <span className="font-mono text-charcoal-600 font-normal">
                              {rt._count?.rooms || 0} physical rooms
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleOpenEditType(rt)}
                                className="text-black hover:underline font-normal transition-colors cursor-pointer"
                              >
                                Edit Details
                              </button>
                              <span className="text-charcoal-300">|</span>
                              <button
                                onClick={() => handleToggleRoomTypeStatus(rt.id, rt.is_active)}
                                className="text-charcoal-600 hover:text-black font-normal transition-colors cursor-pointer"
                              >
                                {rt.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PHYSICAL ROOMS */}
              {activeTab === 'rooms' && (
                <Card>
                  <CardHeader className="pb-3 border-b border-charcoal-100">
                    <CardTitle className="font-normal">Physical Rooms Directory</CardTitle>
                    <CardDescription className="font-normal">
                      Operational room roster with live housekeeping and maintenance states.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {rooms.length === 0 ? (
                      <div className="p-12 text-center text-charcoal-500 font-normal">
                        No physical rooms created yet. Click "Add Physical Room" above to assign rooms to room types.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-charcoal-700">
                          <thead className="bg-canvas-neutral border-b border-charcoal-200 text-xs font-mono uppercase text-charcoal-600 font-normal">
                            <tr>
                              <th className="px-6 py-3 font-normal">Room No.</th>
                              <th className="px-6 py-3 font-normal">Floor</th>
                              <th className="px-6 py-3 font-normal">Room Type</th>
                              <th className="px-6 py-3 font-normal">Operational Status</th>
                              <th className="px-6 py-3 font-normal">Quick Transition</th>
                              <th className="px-6 py-3 font-normal">Schedule Block</th>
                              <th className="px-6 py-3 text-right font-normal">Inventory Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-charcoal-100">
                            {rooms.map((room) => (
                              <tr key={room.id} className="hover:bg-canvas-neutral/50 transition-colors">
                                <td className="px-6 py-4 font-normal text-charcoal-900 font-mono text-base">
                                  {room.room_number}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-charcoal-600 font-normal">Floor {room.floor}</td>
                                <td className="px-6 py-4 font-normal text-charcoal-800">
                                  {room.room_type?.name || 'Unassigned'}
                                </td>
                                <td className="px-6 py-4">{getStatusBadge(room.operational_status)}</td>
                                <td className="px-6 py-4">
                                  <select
                                    value={room.operational_status}
                                    onChange={(e) =>
                                      handleUpdateRoomStatus(room.id, e.target.value as OperationalStatus)
                                    }
                                    className="text-xs border border-charcoal-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-black/20 font-normal"
                                  >
                                    <option value={OperationalStatus.READY}>READY</option>
                                    <option value={OperationalStatus.OCCUPIED}>OCCUPIED</option>
                                    <option value={OperationalStatus.DIRTY}>DIRTY</option>
                                    <option value={OperationalStatus.CLEANING}>CLEANING</option>
                                    <option value={OperationalStatus.INSPECTION}>INSPECTION</option>
                                    <option value={OperationalStatus.MAINTENANCE}>MAINTENANCE</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      setSelectedRoomForBlock(room.id);
                                      setIsCreateBlockModalOpen(true);
                                    }}
                                    className="text-xs text-charcoal-600 hover:text-black flex items-center gap-1 font-mono transition-colors cursor-pointer border border-neutral-200 px-2 py-1 rounded bg-white hover:bg-neutral-50"
                                    title="Schedule future calendar embargo dates for this room"
                                  >
                                    <Calendar className="w-3.5 h-3.5" /> Block Dates
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Badge variant={room.is_active ? 'success' : 'neutral'}>
                                    {room.is_active ? 'IN SERVICE' : 'DECOMMISSIONED'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* TAB 3: MAINTENANCE BLOCKS */}
              {activeTab === 'blocks' && (
                <div className="space-y-6">
                  {/* Informational Callout explaining Floor Status vs Calendar Blocks */}
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-charcoal-700 space-y-2 font-normal">
                    <div className="flex items-center gap-2 text-charcoal-900 font-mono uppercase tracking-wider text-xs">
                      <Info className="w-4 h-4 text-black shrink-0" />
                      <span>Floor Status vs. Calendar Maintenance Blocks</span>
                    </div>
                    <p className="leading-relaxed">
                      • <strong>Operational Status (Dropdown in Physical Rooms)</strong> flags immediate chamber turnover condition on the hotel floor right now (<span className="font-mono">READY</span>, <span className="font-mono">DIRTY</span>, <span className="font-mono">MAINTENANCE</span>). It updates the Physical Rooms Lifecycle completion bar instantly.
                    </p>
                    <p className="leading-relaxed">
                      • <strong>Maintenance Blocks (Below)</strong> represent calendar-scheduled reservation embargoes with defined start and end dates. These subtract physical units from guest online booking capacity across those specific stay nights.
                    </p>
                  </div>

                  {/* Active Floor Maintenance Highlights */}
                  {floorMaintenanceRooms.length > 0 && (
                    <Card className="border border-neutral-300 bg-neutral-50/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
                            <CardTitle className="text-sm font-normal text-neutral-900 font-mono">
                              Rooms In Immediate Floor Maintenance ({floorMaintenanceRooms.length})
                            </CardTitle>
                          </div>
                          <span className="text-xs text-neutral-600 font-mono">Real-Time Floor Flag</span>
                        </div>
                        <CardDescription className="text-xs text-neutral-500 font-normal">
                          These rooms are flagged Out-of-Order today. To embargo them from future online reservations, schedule date windows below.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2 pt-2">
                          {floorMaintenanceRooms.map((r) => (
                            <div
                              key={r.id}
                              className="bg-white border border-neutral-300 rounded px-3 py-1.5 flex items-center gap-3 text-xs"
                            >
                              <span className="font-mono text-neutral-900">
                                Room {r.room_number} (Floor {r.floor})
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedRoomForBlock(r.id);
                                  setIsCreateBlockModalOpen(true);
                                }}
                                className="text-[11px] text-neutral-900 hover:text-black underline font-mono cursor-pointer"
                              >
                                + Schedule Dates
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scheduled Calendar Blocks Table */}
                  <Card>
                    <CardHeader className="pb-3 border-b border-charcoal-100 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-normal">Scheduled Reservation Calendar Blocks</CardTitle>
                        <CardDescription className="font-normal">
                          Out-of-order date windows that subtract room inventory strictly on overlapping stay nights.
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          if (rooms.length > 0) setSelectedRoomForBlock(rooms[0].id);
                          setIsCreateBlockModalOpen(true);
                        }}
                        className="gap-2 font-normal"
                        size="sm"
                      >
                        <Plus className="w-4 h-4" /> Schedule New Block
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {blocks.length === 0 ? (
                        <div className="p-12 text-center text-charcoal-500 font-normal">
                          No scheduled maintenance blocks. All active physical rooms are commercially available across booking calendars.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-charcoal-700">
                            <thead className="bg-canvas-neutral border-b border-charcoal-200 text-xs font-mono uppercase text-charcoal-600 font-normal">
                              <tr>
                                <th className="px-6 py-3 font-normal">Room</th>
                                <th className="px-6 py-3 font-normal">Block Window (UTC)</th>
                                <th className="px-6 py-3 font-normal">Reason</th>
                                <th className="px-6 py-3 text-right font-normal">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-charcoal-100">
                              {blocks.map((block) => (
                                <tr key={block.id} className="hover:bg-canvas-neutral/50 transition-colors">
                                  <td className="px-6 py-4 font-mono font-normal text-charcoal-900">
                                    Room {block.room?.room_number || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-charcoal-600 font-normal">
                                    {new Date(block.start_date).toLocaleDateString()} &rarr;{' '}
                                    {new Date(block.end_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-charcoal-800 font-normal">{block.reason}</td>
                                  <td className="px-6 py-4 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteBlock(block.id)}
                                      className="text-red-600 border-red-200 hover:bg-red-50 font-normal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Release Block
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  </main>

      {/* MODAL: CREATE ROOM TYPE */}
      <Modal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        title="Add Room Category"
      >
        <form onSubmit={handleCreateRoomType} className="space-y-4">
          {typeModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-normal">
              {typeModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Room Category Name *</label>
            <Input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="e.g. Deluxe Tuileries Suite"
              required
            />
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Description</label>
            <textarea
              value={typeDescription}
              onChange={(e) => setTypeDescription(e.target.value)}
              placeholder="Spacious suite overlooking historical gardens..."
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20 font-normal"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Guests</label>
              <Input
                type="number"
                min="1"
                value={typeMaxGuests}
                onChange={(e) => setTypeMaxGuests(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Adults</label>
              <Input
                type="number"
                min="1"
                value={typeMaxAdults}
                onChange={(e) => setTypeMaxAdults(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Children</label>
              <Input
                type="number"
                min="0"
                value={typeMaxChildren}
                onChange={(e) => setTypeMaxChildren(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Bed Configuration</label>
              <Input
                value={typeBedType}
                onChange={(e) => setTypeBedType(e.target.value)}
                placeholder="e.g. 1 King Bed"
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Size (m²)</label>
              <Input
                type="number"
                step="0.1"
                value={typeSizeSqm}
                onChange={(e) => setTypeSizeSqm(e.target.value)}
                placeholder="45.0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">
              Amenities (comma-separated)
            </label>
            <Input
              value={typeAmenities}
              onChange={(e) => setTypeAmenities(e.target.value)}
              placeholder="High-Speed Wi-Fi, Balcony, Minibar, Espresso Maker"
            />
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">
              Initial Base Rate (₹, e.g. 25000)
            </label>
            <Input
              type="number"
              step="0.01"
              value={typeBasePrice}
              onChange={(e) => setTypeBasePrice(e.target.value)}
              placeholder="25000"
            />
            <span className="text-[10px] text-charcoal-500 font-mono mt-0.5 block font-normal">
              Automatically creates a default flexible rate plan.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsCreateTypeModalOpen(false)} className="font-normal">
              Cancel
            </Button>
            <Button type="submit" isLoading={typeActionLoading} className="font-normal">
              Create Room Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT ROOM TYPE */}
      <Modal
        isOpen={isEditTypeModalOpen}
        onClose={() => {
          setIsEditTypeModalOpen(false);
          setSelectedType(null);
        }}
        title={`Edit Room Category — ${selectedType?.name || ''}`}
      >
        <form onSubmit={handleSaveEditType} className="space-y-4">
          {typeModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-normal">
              {typeModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Room Category Name *</label>
            <Input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Description</label>
            <textarea
              value={typeDescription}
              onChange={(e) => setTypeDescription(e.target.value)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20 font-normal"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Guests</label>
              <Input
                type="number"
                min="1"
                value={typeMaxGuests}
                onChange={(e) => setTypeMaxGuests(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Adults</label>
              <Input
                type="number"
                min="1"
                value={typeMaxAdults}
                onChange={(e) => setTypeMaxAdults(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Max Children</label>
              <Input
                type="number"
                min="0"
                value={typeMaxChildren}
                onChange={(e) => setTypeMaxChildren(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Bed Configuration</label>
              <Input
                value={typeBedType}
                onChange={(e) => setTypeBedType(e.target.value)}
                placeholder="e.g. 1 King Bed"
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Size (m²)</label>
              <Input
                type="number"
                step="0.1"
                value={typeSizeSqm}
                onChange={(e) => setTypeSizeSqm(e.target.value)}
                placeholder="45.0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">
              Amenities (comma-separated)
            </label>
            <Input
              value={typeAmenities}
              onChange={(e) => setTypeAmenities(e.target.value)}
              placeholder="High-Speed Wi-Fi, Balcony, Minibar, Espresso Maker"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditTypeModalOpen(false);
                setSelectedType(null);
              }}
              className="font-normal"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={typeActionLoading} className="font-normal">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE PHYSICAL ROOM */}
      <Modal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        title="Add Physical Room"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {roomModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-normal">
              {roomModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Room Category *</label>
            <select
              value={roomTypeIdForRoom}
              onChange={(e) => setRoomTypeIdForRoom(e.target.value)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20 font-normal"
              required
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Room Number *</label>
              <Input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 101, 204A"
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Floor *</label>
              <Input
                type="number"
                min="0"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Initial Status</label>
            <select
              value={roomInitialStatus}
              onChange={(e) => setRoomInitialStatus(e.target.value as OperationalStatus)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20 font-normal"
            >
              <option value={OperationalStatus.READY}>READY (Clean & Available)</option>
              <option value={OperationalStatus.DIRTY}>DIRTY (Needs Turnover)</option>
              <option value={OperationalStatus.CLEANING}>CLEANING (Housekeeping in progress)</option>
              <option value={OperationalStatus.MAINTENANCE}>MAINTENANCE (Out of service)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsCreateRoomModalOpen(false)} className="font-normal">
              Cancel
            </Button>
            <Button type="submit" isLoading={roomActionLoading} className="font-normal">
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE MAINTENANCE BLOCK */}
      <Modal
        isOpen={isCreateBlockModalOpen}
        onClose={() => setIsCreateBlockModalOpen(false)}
        title="Schedule Maintenance Block"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4">
          {blockModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-normal">
              {blockModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Target Room *</label>
            <select
              value={selectedRoomForBlock}
              onChange={(e) => setSelectedRoomForBlock(e.target.value)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20 font-normal"
              required
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} (Floor {r.floor} - {r.room_type?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Start Date *</label>
              <Input
                type="date"
                value={blockStartDate}
                onChange={(e) => setBlockStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">End Date *</label>
              <Input
                type="date"
                value={blockEndDate}
                onChange={(e) => setBlockEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">Reason for Block *</label>
            <Input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Plumbing Repair, Painting, Deep Sanitation"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsCreateBlockModalOpen(false)} className="font-normal">
              Cancel
            </Button>
            <Button type="submit" isLoading={blockActionLoading} className="font-normal">
              Schedule Block
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ManagerInventoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-neutral" />}>
      <ManagerInventoryContent />
    </Suspense>
  );
}
