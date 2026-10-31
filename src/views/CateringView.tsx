import { translateText } from '../services/i18n';
import React, { useEffect, useRef, useState } from 'react';
import {
  ChefHat,
  Plus,
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Truck,
  Box,
  Mic,
  DollarSign,
  ShieldCheck,
  X,
  Trash2,
  Check,
  UserCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { db } from '../services/db';
import { useTranslation } from '../services/i18n';
import {
  BusinessId,
  BUSINESSES,
  CateringOrder,
  CateringOrderStatus,
  CateringOrderItem,
  Staff,
  Attendance
} from '../types/database';
import { androidAutomation } from '../services/androidAutomation';
import { voice } from '../services/voice';

interface CateringViewProps {
  currentBusinessId: BusinessId;
}

export const CateringView: React.FC<CateringViewProps> = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'orders' | 'allocation'>('orders');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<CateringOrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Database Data States
  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);

  // Selected Order for Allocation Engine
  const [selectedOrderIdForAllocation, setSelectedOrderIdForAllocation] = useState<string | null>(null);

  // New Order Modal State
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [eventType, setEventType] = useState<'wedding' | 'birthday' | 'corporate' | 'reception' | 'anniversary' | 'other' | ''>('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [transportRequired, setTransportRequired] = useState(false);
  const [transportNotes, setTransportNotes] = useState('');
  const [equipmentRequired, setEquipmentRequired] = useState(false);
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Menu items list state
  const [menuItems, setMenuItems] = useState<CateringOrderItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<CateringOrderStatus | ''>('');
  const [orderError, setOrderError] = useState('');
  const [saving, setSaving] = useState(false);

  // Voice Listening
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const voiceOwned = useRef(false); const voiceStarted = useRef(false);

  const loadData = async () => {
    const o = await db.getCateringOrders();
    const s = await db.getStaff();
    const a = await db.getAttendance();

    setOrders(o);
    setStaffList(s);
    setAttendanceList(a);

    if (o.length > 0 && !selectedOrderIdForAllocation) {
      setSelectedOrderIdForAllocation(o[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatusFilter === 'all' ? true : o.status === selectedStatusFilter;
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.eventType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate staffing rules for an order
  const getRequiredStaffBreakdown = (guests: number, hasTransport: boolean) => {
    const cooks = Math.max(1, Math.ceil(guests / 75));
    const helpers = Math.max(1, Math.ceil(guests / 50));
    const waiters = Math.max(2, Math.ceil(guests / 25));
    const supervisors = Math.max(1, Math.ceil(guests / 150));
    const cleaners = Math.max(1, Math.ceil(guests / 60));
    const drivers = hasTransport ? 1 : 0;

    return {
      cooks,
      helpers,
      waiters,
      supervisors,
      cleaners,
      drivers,
      totalRequired: cooks + helpers + waiters + supervisors + cleaners + drivers
    };
  };

  // Add order submit
  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guests = Number(guestCount); const total = Number(totalAmount); const adv = Number(advanceAmount);
    if (!customerName.trim() || !eventType || !orderStatus || !eventDate || !Number.isInteger(guests) || guests <= 0 || !Number.isFinite(total) || total <= 0 || !advanceAmount.trim() || !Number.isFinite(adv) || adv < 0 || adv > total || menuItems.some(item => !item.itemName.trim() || !item.unit.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setOrderError('Enter the event details and an advance between zero and the total. Complete or remove each menu item.'); return;
    }
    if (saving) return; setSaving(true); setOrderError('');

    const breakdown = getRequiredStaffBreakdown(guests, transportRequired);

    try {
    await db.addCateringOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      eventType,
      eventDate,
      eventTime: eventTime || undefined,
      venue: venue.trim(),
      guestCount: guests,
      menuItems,
      totalAmount: total,
      advanceAmount: adv,
      transportRequired,
      transportNotes,
      equipmentRequired,
      equipmentNotes,
      status: orderStatus,
      requiredCooks: breakdown.cooks,
      requiredHelpers: breakdown.helpers,
      requiredWaiters: breakdown.waiters,
      requiredSupervisors: breakdown.supervisors,
      requiredCleaners: breakdown.cleaners,
      requiredDrivers: breakdown.drivers,
      assignedStaffIds: [],
      notes: orderNotes
    });

    setCustomerName('');
    setCustomerPhone('');
    setTotalAmount('');
    setAdvanceAmount('');
    setVenue(''); setEventTime(''); setGuestCount(''); setEventType(''); setOrderStatus(''); setMenuItems([]); setTransportRequired(false); setEquipmentRequired(false); setTransportNotes(''); setEquipmentNotes(''); setOrderNotes('');
    setShowAddOrderModal(false);
    } catch (error) { setOrderError(error instanceof Error ? error.message : 'Could not save booking.'); }
    finally { setSaving(false); }
  };

  // Dictation is captured as a note for review; uncertain details are not auto-filled.
  useEffect(() => {
    const unsubscribe = voice.subscribe(state => {
      if (!voiceOwned.current) return;
      if (state.error) { voiceOwned.current = false; setIsVoiceListening(false); setVoiceError(state.error); return; }
      if (state.isListening) { voiceStarted.current = true; setIsVoiceListening(true); }
      if (voiceStarted.current && !state.isListening) {
        voiceOwned.current = false; voiceStarted.current = false; setIsVoiceListening(false);
        const transcript = voice.takeTranscript();
        if (transcript) { setOrderNotes(existing => existing ? `${existing} ${transcript}` : transcript); setShowAddOrderModal(true); }
      }
    });
    return () => { unsubscribe(); if (voiceOwned.current) { voiceOwned.current = false; voice.stopListening(); voice.takeTranscript(); } };
  }, []);
  const handleVoiceOrderClick = () => {
    if (isVoiceListening) { voice.stopListening(); return; }
    voice.takeTranscript(); voiceOwned.current = true; voiceStarted.current = false; setVoiceError(''); voice.startListening('hi-IN');
  };

  // Status Change Handler
  const handleUpdateStatus = async (id: string, newStatus: CateringOrderStatus) => {
    await db.updateCateringOrder(id, { status: newStatus });
  };

  // Add Item to Menu
  const handleAddMenuItem = () => {
    setMenuItems([...menuItems, { itemName: '', quantity: 0, unit: '' }]);
  };

  const handleUpdateMenuItem = (index: number, field: keyof CateringOrderItem, value: any) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const handleRemoveMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  // Staff Availability Engine calculations for selected order
  const activeAllocationOrder = orders.find((o) => o.id === selectedOrderIdForAllocation) || orders[0];

  const getStaffAvailabilityForOrder = (order: CateringOrder) => {
    if (!order) return { availableStaff: [], conflictStaffIds: new Set<string>() };

    const targetDate = order.eventDate;

    // Check conflict: Staff already assigned to ANOTHER catering order on same date
    const conflictingStaffIds = new Set<string>();
    orders.forEach((o) => {
      if (o.id !== order.id && o.status !== 'cancelled' && o.eventDate === targetDate) {
        o.assignedStaffIds.forEach((sId) => conflictingStaffIds.add(sId));
      }
    });

    // Check attendance: Staff marked absent on event date
    attendanceList.forEach((att) => {
      if (att.date === targetDate && (att.status === 'absent' || att.status === 'weekly_off')) {
        conflictingStaffIds.add(att.staffId);
      }
    });

    // Available staff are active staff members NOT in conflicting set
    const availableStaff = staffList.filter((s) => !conflictingStaffIds.has(s.id));

    return {
      availableStaff,
      conflictingStaffIds
    };
  };

  const currentAllocationMetrics = activeAllocationOrder
    ? getStaffAvailabilityForOrder(activeAllocationOrder)
    : { availableStaff: [], conflictingStaffIds: new Set<string>() };

  const reqBreakdown = activeAllocationOrder
    ? getRequiredStaffBreakdown(activeAllocationOrder.guestCount, activeAllocationOrder.transportRequired)
    : { cooks: 0, helpers: 0, waiters: 0, supervisors: 0, cleaners: 0, drivers: 0, totalRequired: 0 };

  const [temporaryAssignedIds, setTemporaryAssignedIds] = useState<string[]>([]);
  const [allocationError, setAllocationError] = useState('');

  useEffect(() => {
    if (activeAllocationOrder) {
      setTemporaryAssignedIds(activeAllocationOrder.assignedStaffIds || []);
    }
  }, [selectedOrderIdForAllocation, orders]);

  const toggleStaffAssignment = (staffId: string) => {
    if (temporaryAssignedIds.includes(staffId)) {
      setTemporaryAssignedIds(temporaryAssignedIds.filter((id) => id !== staffId));
    } else {
      setTemporaryAssignedIds([...temporaryAssignedIds, staffId]);
    }
  };

  const handleSaveApprovedAllocation = async () => {
    if (!activeAllocationOrder) return;
    try { setAllocationError(''); await db.assignStaffToCateringOrder(activeAllocationOrder.id, temporaryAssignedIds); androidAutomation.playSoundEffect('success'); }
    catch (error) { setAllocationError(error instanceof Error ? error.message : 'Could not save allocation.'); }
  };

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28 text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50 via-white to-indigo-50 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 p-4 rounded-3xl border border-purple-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('cateringTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            {t('cateringSubtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVoiceOrderClick}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition ${
              isVoiceListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-white hover:bg-purple-50 text-purple-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-purple-300 border border-purple-500/40'
            }`}
          >
            <Mic className="w-4 h-4 text-purple-400" />
            <span>{isVoiceListening ? t('listening') : t('voiceOrder')}</span>
          </button>

          <button
            onClick={() => setShowAddOrderModal(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('newCateringOrder')}</span>
          </button>
        </div>
      </div>

      {voiceError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{voiceError}</p>}
      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('cateringOrdersTab')} ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('allocation')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'allocation'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('allocationEngine')}</span>
        </button>
      </div>

      {/* TAB 1: CATERING ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">{translateText("Status:")}</span>
              {['all', 'confirmed', 'in_progress', 'completed', 'cancelled', 'enquiry'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedStatusFilter === status
                      ? 'bg-purple-600 text-white border border-purple-400'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {translateText(status.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '))}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={translateText("Search by customer, phone or venue...")}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-400 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Orders Cards Grid */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <ChefHat className="w-12 h-12 text-purple-400 mx-auto opacity-60" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('noCateringOrders')}</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{translateText("No catering bookings recorded for this filter. Use \"+ New Catering Order\" or speak to GopalAI to add outside catering events.")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map((order) => {
                const pending = order.pendingAmount;

                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition space-y-4 shadow-lg"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase">
                            {order.eventType}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            {order.eventDate} ({order.eventTime || translateText('Time not set')})
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">{order.customerName}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.venue}</div>
                      </div>

                      <button
                        onClick={() => androidAutomation.initiatePhoneCall(order.customerPhone)}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 transition flex items-center gap-1 text-xs font-bold"
                        title={translateText("Call Customer")}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{translateText("Call")}</span>
                      </button>
                    </div>

                    {/* Guest Count & Financial summary */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Guest Count")}</span>
                        <span className="text-sm font-black text-purple-700 dark:text-purple-300">{order.guestCount}{" " + translateText("Pax")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Total Booking")}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">₹{order.totalAmount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Pending Balance")}</span>
                        <span className={`text-sm font-black ${pending > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          ₹{pending}
                        </span>
                      </div>
                    </div>

                    {/* Requirements Tags */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {order.transportRequired && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Truck className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          <span>{translateText("Transport Needed")}</span>
                        </span>
                      )}
                      {order.equipmentRequired && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Box className="w-3 h-3 text-purple-400" />
                          <span>{translateText("Buffet Setup")}</span>
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-900/50 text-purple-300 font-semibold">{translateText("Assigned Staff:") + " "}{order.assignedStaffIds.length} / {order.requiredCooks + order.requiredWaiters + order.requiredSupervisors}
                      </span>
                    </div>

                    {/* Status Stepper Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-purple-700 dark:text-purple-300 font-bold focus:border-purple-400"
                        >
                          <option value="enquiry">{translateText("Enquiry")}</option>
                          <option value="confirmed">{translateText("Confirmed")}</option>
                          <option value="in_progress">{translateText("In Progress")}</option>
                          <option value="completed">{translateText("Completed")}</option>
                          <option value="cancelled">{translateText("Cancelled")}</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrderIdForAllocation(order.id);
                            setActiveTab('allocation');
                          }}
                          className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                        >{translateText("Allocate Staff")}</button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this booking? Previously recorded sales and reminders will not be deleted.')) await db.deleteCateringOrder(order.id);
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-300"
                          title={translateText("Delete Order")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF CONFLICT & ALLOCATION ENGINE */}
      {activeTab === 'allocation' && (
        <div className="space-y-5">
          {orders.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">{translateText("No catering orders registered to calculate allocation for.")}</div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Order Selector Banner */}
              <div className="bg-white/90 dark:bg-slate-900/80 border border-purple-500/30 rounded-3xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block">{translateText("Target Catering Booking Event")}</span>
                    <select
                      value={selectedOrderIdForAllocation || ''}
                      onChange={(e) => setSelectedOrderIdForAllocation(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-extrabold focus:border-purple-400 mt-1 w-full sm:w-80"
                    >
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.customerName} — {o.eventType.toUpperCase()} ({o.guestCount}{" " + translateText("Pax -") + " "}{o.eventDate})
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeAllocationOrder && (
                    <div className="text-right text-xs bg-purple-950/30 p-3 rounded-2xl border border-purple-900/50">
                      <div className="font-bold text-slate-900 dark:text-white">{activeAllocationOrder.venue}</div>
                      <div className="text-slate-500 dark:text-slate-400">{translateText("Event Date:") + " "}<strong className="text-amber-700 dark:text-amber-400">{activeAllocationOrder.eventDate}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement vs Available Gap Breakdown Cards */}
              {activeAllocationOrder && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Estimated cooks")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.cooks}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Estimated helpers")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.helpers}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Estimated waiters")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.waiters}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Supervisors")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.supervisors}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Cleaners")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.cleaners}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Drivers")}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">{reqBreakdown.drivers}</div>
                  </div>
                </div>
              )}

              {/* Staff Roster Conflict Checklist & Allocation */}
              <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      <span>{translateText("Available Employee Pool (Cross-Business Allocation)")}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{translateText("Select available staff from Jain Sweets, Paan Bai, Kesarwadi & Gopal Caterers. Double-booked staff are flagged automatically.")}</p>
                  </div>

                  <button
                    onClick={handleSaveApprovedAllocation}
                    className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
                  >{translateText("Approve & Save Staff Allocation")}</button>
                </div>

                {allocationError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{allocationError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staffList.map((member) => {
                    const isConflicting = currentAllocationMetrics?.conflictingStaffIds
                      ? currentAllocationMetrics.conflictingStaffIds.has(member.id)
                      : false;
                    const isSelected = temporaryAssignedIds.includes(member.id);
                    const biz = BUSINESSES[member.assignedLocation || member.businessId];

                    return (
                      <label
                        key={member.id}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isConflicting
                            ? 'bg-slate-100 dark:bg-slate-950/40 border-rose-200 dark:border-rose-900/40 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isConflicting}
                            checked={isSelected}
                            onChange={() => toggleStaffAssignment(member.id)}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{member.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400">
                                {member.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{translateText("Primary Location:") + " "}<strong>{biz?.name}</strong> • {member.department || translateText('Department not set')}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isConflicting ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{translateText("Busy / Leave")}</span>
                            </span>
                          ) : isSelected ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{translateText("Allocated")}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">{translateText("Click to assign")}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW CATERING ORDER MODAL */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddOrderSubmit}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-purple-500/40 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
              <h3 className="text-sm font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-purple-400" />
                <span>{translateText("New Outside Catering Booking Order")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddOrderModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Customer Name*")}</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={translateText("e.g. Vikram Sharma")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Phone Number*")}</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={translateText("e.g. +91 9876543210")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Event Type")}</label>
                <select
                  required
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                >
                  <option value="" disabled>{translateText("Choose event type")}</option>
                  <option value="wedding">{translateText("Wedding Banquet")}</option>
                  <option value="birthday">{translateText("Birthday Party")}</option>
                  <option value="corporate">{translateText("Corporate Event")}</option>
                  <option value="reception">{translateText("Reception")}</option>
                  <option value="anniversary">{translateText("Anniversary")}</option>
                  <option value="other">{translateText("Other Event")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Booking status*")}</label>
                <select required value={orderStatus} onChange={e => setOrderStatus(e.target.value as CateringOrderStatus)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white">
                  <option value="" disabled>{translateText("Choose status")}</option><option value="enquiry">{translateText("Enquiry")}</option><option value="confirmed">{translateText("Confirmed")}</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Event Date & Time*")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                  />
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Venue Address")}</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder={translateText("e.g. Shahi Gardens, Civil Lines")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Guest Count (Pax)*")}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder={translateText("e.g. 250")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-purple-700 dark:text-purple-300 font-bold focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Total Order Amount (₹)*")}</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder={translateText("e.g. 85000")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Advance Received (₹)")}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder={translateText("e.g. 25000")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold focus:border-purple-400"
                />
              </div>
            </div>

            {/* Menu Items Editor */}
            <div className="space-y-2 bg-slate-100 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{translateText("Catering Menu Items & Quantities")}</span>
                <button
                  type="button"
                  onClick={handleAddMenuItem}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{translateText("Add Item")}</span>
                </button>
              </div>

              <div className="space-y-2">
                {menuItems.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder={translateText("Dish name (e.g. Paneer Butter Masala)")}
                      value={item.itemName}
                      onChange={(e) => handleUpdateMenuItem(idx, 'itemName', e.target.value)}
                      className="flex-1 min-w-0 basis-32 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder={translateText("Qty")}
                      value={item.quantity || ''}
                      onChange={(e) => handleUpdateMenuItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400 text-center font-bold"
                    />
                    <select required value={item.unit} onChange={e => handleUpdateMenuItem(idx, 'unit', e.target.value)} aria-label={translateText("Menu item unit")} className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-1 text-xs text-slate-900 dark:text-white">
                      <option value="" disabled>{translateText("Unit")}</option><option value="plates">{translateText("plates")}</option><option value="pcs">{translateText("pcs")}</option><option value="kg">{translateText("kg")}</option><option value="litre">{translateText("litre")}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveMenuItem(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Transport & Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <input
                    type="checkbox"
                    checked={transportRequired}
                    onChange={(e) => setTransportRequired(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>{translateText("Transport Vehicle Required")}</span>
                </label>
                <input
                  type="text"
                  value={transportNotes}
                  onChange={(e) => setTransportNotes(e.target.value)}
                  placeholder={translateText("Transport details...")}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <input
                    type="checkbox"
                    checked={equipmentRequired}
                    onChange={(e) => setEquipmentRequired(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>{translateText("Buffet & Equipment Setup Required")}</span>
                </label>
                <input
                  type="text"
                  value={equipmentNotes}
                  onChange={(e) => setEquipmentNotes(e.target.value)}
                  placeholder={translateText("Equipment details...")}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <label className="block text-xs text-slate-600 dark:text-slate-400">{translateText("Notes (including voice dictation)")}
              <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white" />
            </label>
            <p className="text-xs text-slate-500">{translateText("The advance is recorded on this booking only. Record any sale or reminder separately with its actual details.")}</p>
            <p className="text-xs text-slate-500">{translateText("Estimated staff (based on guest count):")}{' '}{Number(guestCount) > 0 ? `${getRequiredStaffBreakdown(Number(guestCount), transportRequired).totalRequired}` : translateText('Enter guest count')}. {translateText("This is an estimate, not a confirmed requirement.")}</p>
            {orderError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{orderError}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddOrderModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 shadow-lg"
              >{translateText("Save Catering Booking")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
