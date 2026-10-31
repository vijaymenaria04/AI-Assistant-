import { localDate } from '../services/localDate';
import { translateText } from '../services/i18n';
import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Users,
  Plus,
  Calendar,
  Check,
  X,
  Phone,
  ArrowRightLeft,
  Calculator,
  ChefHat,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Building2,
  Trash2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { db } from '../services/db';
import { useTranslation } from '../services/i18n';
import {
  BusinessId,
  BUSINESSES,
  Staff,
  Attendance,
  StaffTransfer,
  ManpowerPlan,
  CateringEvent,
  StaffAdvance,
  SalaryRecord
} from '../types/database';
import { androidAutomation } from '../services/androidAutomation';

interface StaffViewProps {
  currentBusinessId: BusinessId;
}

export const StaffView: React.FC<StaffViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'roster' | 'planning' | 'attendance' | 'payroll'>('roster');
  const [selectedLocation, setSelectedLocation] = useState<BusinessId | 'all'>(
    currentBusinessId
  );

  // Core Database States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [transferHistory, setTransferHistory] = useState<StaffTransfer[]>([]);
  const [manpowerPlans, setManpowerPlans] = useState<ManpowerPlan[]>([]);
  const [cateringEvents, setCateringEvents] = useState<CateringEvent[]>([]);
  const [advancesList, setAdvancesList] = useState<StaffAdvance[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(localDate());

  // Modal & Form States
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showManpowerModal, setShowManpowerModal] = useState(false);
  const [showCateringModal, setShowCateringModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSalaryConfirmModal, setShowSalaryConfirmModal] = useState(false);
  const [payrollError, setPayrollError] = useState('');
  const [payrollSaving, setPayrollSaving] = useState(false);

  // New Staff Form State
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffLocation, setStaffLocation] = useState<BusinessId | ''>(currentBusinessId === 'personal' ? '' : currentBusinessId);
  const [staffDepartment, setStaffDepartment] = useState('Kitchen');
  const [staffShift, setStaffShift] = useState<'Morning' | 'Evening' | 'Full Day' | 'Night'>('Full Day');
  const [staffSalary, setStaffSalary] = useState('');
  const [staffCycle, setStaffCycle] = useState<'monthly' | 'daily'>('monthly');
  const [staffWeeklyOff, setStaffWeeklyOff] = useState('');
  const [staffOvertimeRate, setStaffOvertimeRate] = useState('');

  // Staff Transfer Form State
  const [transferStaffId, setTransferStaffId] = useState('');
  const [transferTargetLocation, setTransferTargetLocation] = useState<BusinessId>('paan-bai');
  const [transferReason, setTransferReason] = useState('');

  // Manpower Plan Form State
  const [planLocation, setPlanLocation] = useState<BusinessId | ''>(currentBusinessId === 'personal' ? '' : currentBusinessId);
  const [planDepartment, setPlanDepartment] = useState('Kitchen');
  const [planShift, setPlanShift] = useState<'Morning' | 'Evening' | 'Full Day' | 'Night'>('Full Day');
  const [planRequiredCount, setPlanRequiredCount] = useState('');

  // Catering Event Form State
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [eventVenue, setEventVenue] = useState('');
  const [eventGuests, setEventGuests] = useState('');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  // Advance / Deduction Form State
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advType, setAdvType] = useState<'advance' | 'deduction'>('advance');
  const [advNotes, setAdvNotes] = useState('');

  // Payroll Confirmation Modal State
  const [pendingPayroll, setPendingPayroll] = useState<{
    staff: Staff;
    period: string;
    daysPresent: number;
    daysHalfDay: number;
    daysAbsent: number;
    daysWeeklyOff: number;
    daysExtraShift: number;
    baseEarnings: number;
    overtimeEarnings: number;
    totalAdvancesDeducted: number;
    otherDeductions: number;
    netPayable: number;
    paymentMethod: 'cash' | 'upi' | 'bank';
  } | null>(null);

  // Sync with prop when changed
  useEffect(() => {
    setSelectedLocation(currentBusinessId);
  }, [currentBusinessId]);

  const loadData = async () => {
    const s = await db.getStaff();
    const a = await db.getAttendance(undefined, selectedDate);
    const t = await db.getStaffTransfers();
    const mp = await db.getManpowerPlans();
    const cat = await db.getCateringEvents();
    const adv = await db.getStaffAdvances();
    const sal = await db.getSalaries();

    setStaffList(s);
    setAttendanceList(a);
    setTransferHistory(t);
    setManpowerPlans(mp);
    setCateringEvents(cat);
    setAdvancesList(adv);
    setSalaryRecords(sal);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, [selectedDate]);

  // Business locations list (excluding personal)
  const businessLocations: BusinessId[] = ['jain-sweets', 'paan-bai', 'kesarwadi', 'gopal-caterers'];

  // Filtered staff members
  const filteredStaff = staffList.filter((staff) => {
    const matchesLocation =
      selectedLocation === 'all' ? true : staff.assignedLocation === selectedLocation;
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone.includes(searchQuery);
    return matchesLocation && matchesSearch;
  });

  const scopedTransfers = transferHistory.filter(t => selectedLocation === 'all' || t.fromBusinessId === selectedLocation || t.toBusinessId === selectedLocation);
  const scopedPlans = manpowerPlans.filter(p => selectedLocation === 'all' || p.businessId === selectedLocation);
  const scopedSalaries = salaryRecords.filter(s => selectedLocation === 'all' || s.businessId === selectedLocation);
  const scopedEvents = selectedLocation === 'all' || selectedLocation === 'gopal-caterers' ? cateringEvents : [];

  // Location-wise metrics
  const getLocationMetrics = (bId: BusinessId) => {
    const assigned = staffList.filter((s) => s.assignedLocation === bId);
    const todayAtt = attendanceList.filter((a) => a.businessId === bId && (a.status === 'present' || a.status === 'half_day' || a.status === 'extra_shift'));
    const required = manpowerPlans
      .filter((mp) => mp.businessId === bId)
      .reduce((sum, item) => sum + item.requiredCount, 0);

    const workingToday = todayAtt.length;
    const available = assigned.length;
    const shortageOrSurplus = available - required;

    return {
      available,
      workingToday,
      required,
      shortageOrSurplus,
      hasPlan: manpowerPlans.some(mp => mp.businessId === bId)
    };
  };

  // Handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffLocation || !staffRole.trim() || staffSalary.trim() === '' || !Number.isFinite(Number(staffSalary)) || Number(staffSalary) < 0 || (staffOvertimeRate.trim() !== '' && (!Number.isFinite(Number(staffOvertimeRate)) || Number(staffOvertimeRate) < 0))) return;

    await db.addStaff({
      businessId: staffLocation,
      assignedLocation: staffLocation,
      name: staffName.trim(),
      role: staffRole,
      phone: staffPhone.trim(),
      salaryAmount: Number(staffSalary),
      salaryCycle: staffCycle,
      dateJoined: selectedDate,
      weeklyOff: staffWeeklyOff || undefined,
      overtimeRate: staffOvertimeRate.trim() ? Number(staffOvertimeRate) : undefined,
      department: staffDepartment,
      shift: staffShift,
      status: 'active',
      advanceBalance: 0
    });

    setStaffName('');
    setStaffPhone('');
    setStaffSalary('');
    setShowAddStaffModal(false);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStaffId) return;

    await db.transferStaff(transferStaffId, transferTargetLocation, transferReason);
    setShowTransferModal(false);
    setTransferStaffId('');
    setTransferReason('');
  };

  const handleManpowerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(planRequiredCount);
    if (!planLocation || !planRequiredCount.trim() || !Number.isInteger(count) || count <= 0) return;

    await db.saveManpowerPlan({
      businessId: planLocation,
      department: planDepartment,
      shift: planShift,
      requiredCount: count
    });

    setShowManpowerModal(false);
  };

  const handleCateringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guests = parseInt(eventGuests, 10) || 0;
    if (!eventName.trim() || guests <= 0) return;

    // Automatic staffing calculation formula:
    // Waiters: 1 per 25 guests (min 2)
    // Cooks: 1 per 75 guests (min 1)
    // Supervisors: 1 per 150 guests (min 1)
    const requiredWaiters = Math.max(2, Math.ceil(guests / 25));
    const requiredCooks = Math.max(1, Math.ceil(guests / 75));
    const requiredSupervisors = Math.max(1, Math.ceil(guests / 150));

    await db.addCateringEvent({
      eventName: eventName.trim(),
      eventDate,
      location: eventVenue.trim(),
      guestCount: guests,
      requiredWaiters,
      requiredCooks,
      requiredSupervisors,
      assignedStaffIds
    });

    setEventName('');
    setEventVenue('');
    setAssignedStaffIds([]);
    setShowCateringModal(false);
  };

  const [advanceError, setAdvanceError] = useState('');
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advAmount) || 0;
    if (!advStaffId || amt <= 0) return;

    const staff = staffList.find((s) => s.id === advStaffId);
    if (!staff) return;

    try { setAdvanceError('');
    await db.addStaffAdvance({
      staffId: advStaffId,
      staffName: staff.name,
      businessId: staff.assignedLocation,
      amount: amt,
      type: advType,
      date: selectedDate,
      notes: advNotes
    });

    setAdvAmount('');
    setAdvNotes('');
    setShowAdvanceModal(false);
    } catch (error) { setAdvanceError(error instanceof Error ? error.message : 'Could not record advance.'); }
  };

  const handleRecordAttendance = async (
    staff: Staff,
    status: 'present' | 'absent' | 'half_day' | 'weekly_off' | 'extra_shift',
    overtimeHours: number = 0
  ) => {
    await db.recordAttendance({
      staffId: staff.id,
      businessId: staff.assignedLocation,
      date: selectedDate,
      status,
      overtimeHours
    });
  };

  // Prepare monthly salary statement
  const prepareSalaryCalculation = async (staff: Staff, monthPeriod: string) => {
    // MonthPeriod format YYYY-MM
    const allAtt = await db.getAttendance(staff.assignedLocation);
    const staffAtt = allAtt.filter((a) => a.staffId === staff.id && a.date.startsWith(monthPeriod));
    setPayrollError('');
    if (!staffAtt.length) { setPayrollError('No attendance is recorded for this staff member and period.'); return; }
    if (staffAtt.some(a => (a.overtimeHours || 0) > 0) && staff.overtimeRate === undefined) { setPayrollError('Set an overtime rate before calculating this salary.'); return; }

    let daysPresent = 0;
    let daysHalfDay = 0;
    let daysAbsent = 0;
    let daysWeeklyOff = 0;
    let daysExtraShift = 0;
    let totalOvertimeHours = 0;

    staffAtt.forEach((a) => {
      if (a.status === 'present') daysPresent++;
      else if (a.status === 'half_day') daysHalfDay++;
      else if (a.status === 'absent') daysAbsent++;
      else if (a.status === 'weekly_off') daysWeeklyOff++;
      else if (a.status === 'extra_shift') daysExtraShift++;

      if (a.overtimeHours) totalOvertimeHours += a.overtimeHours;
    });

    // Rule-based salary calculation
    let baseEarnings = 0;
    if (staff.salaryCycle === 'daily') {
      baseEarnings = (daysPresent + daysExtraShift + daysHalfDay * 0.5) * staff.salaryAmount;
    } else {
      // Monthly: Daily rate = monthly salary / 30
      const dailyRate = staff.salaryAmount / 30;
      const payableDays = daysPresent + daysWeeklyOff + daysExtraShift + daysHalfDay * 0.5;
      baseEarnings = Math.round(payableDays * dailyRate);
    }

    const overtimeEarnings = Math.round(totalOvertimeHours * (staff.overtimeRate || 0));
    const totalAdvancesDeducted = Math.min(staff.advanceBalance || 0, baseEarnings + overtimeEarnings);
    const netPayable = Math.max(0, baseEarnings + overtimeEarnings - totalAdvancesDeducted);

    setPendingPayroll({
      staff,
      period: monthPeriod,
      daysPresent,
      daysHalfDay,
      daysAbsent,
      daysWeeklyOff,
      daysExtraShift,
      baseEarnings,
      overtimeEarnings,
      totalAdvancesDeducted,
      otherDeductions: 0,
      netPayable,
      paymentMethod: 'cash'
    });
    setShowSalaryConfirmModal(true);
  };

  const confirmSalaryPayment = async () => {
    if (!pendingPayroll || payrollSaving) return;
    setPayrollSaving(true); setPayrollError('');
    try {
    await db.recordSalaryPayment({
      staffId: pendingPayroll.staff.id,
      staffName: pendingPayroll.staff.name,
      businessId: pendingPayroll.staff.assignedLocation,
      amount: pendingPayroll.baseEarnings,
      overtimePay: pendingPayroll.overtimeEarnings,
      advanceDeducted: pendingPayroll.totalAdvancesDeducted,
      otherDeductions: pendingPayroll.otherDeductions,
      netPaid: pendingPayroll.netPayable,
      date: selectedDate,
      period: pendingPayroll.period,
      paymentMethod: pendingPayroll.paymentMethod,
      status: 'paid',
      notes: `Payroll cleared for ${pendingPayroll.period}. Present: ${pendingPayroll.daysPresent}d.`
    });

    setShowSalaryConfirmModal(false);
    setPendingPayroll(null);
    } catch (error) { setPayrollError(error instanceof Error ? error.message : 'Could not record salary.'); }
    finally { setPayrollSaving(false); }
  };

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28 text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-amber-50 to-orange-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/40 p-4 rounded-3xl border border-amber-500/30 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('workforceTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t('workforceSubtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setStaffLocation(selectedLocation === 'all' || selectedLocation === 'personal' ? '' : selectedLocation); setShowAddStaffModal(true); }}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('addStaff')}</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-slate-700 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{t('transferStaff')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('roster')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'roster'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('workforceLocations')}</span>
        </button>

        <button
          onClick={() => setActiveTab('planning')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'planning'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{t('manpowerCatering')}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'attendance'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('attendanceOvertime')}</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'payroll'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{t('payrollStatements')}</span>
        </button>
      </div>

      {/* Location Filter & Search Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">{translateText("Workspace:")}</span>
          <button
            onClick={() => setSelectedLocation('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedLocation === 'all'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >{translateText("All Workspaces")}</button>
          {businessLocations.map((loc) => {
            const biz = BUSINESSES[loc];
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedLocation === loc
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{translateText(biz.name)}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={translateText("Search staff by name or role...")}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-400 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* TAB 1: WORKFORCE ROSTER & LOCATIONS */}
      {activeTab === 'roster' && (
        <div className="space-y-5">
          {/* 4 Location Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {businessLocations.filter(loc => selectedLocation === 'all' || selectedLocation === loc).map((locKey) => {
              const biz = BUSINESSES[locKey];
              const metrics = getLocationMetrics(locKey);

              return (
                <div
                  key={locKey}
                  onClick={() => setSelectedLocation(locKey)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs ${
                    selectedLocation === locKey
                      ? 'bg-white dark:bg-slate-900 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {translateText(biz.name)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        !metrics.hasPlan ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : metrics.shortageOrSurplus < 0
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : metrics.shortageOrSurplus > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {!metrics.hasPlan ? translateText("No plan set") : metrics.shortageOrSurplus < 0
                        ? `Shortage: ${Math.abs(metrics.shortageOrSurplus)}`
                        : metrics.shortageOrSurplus > 0
                        ? `Surplus: +${metrics.shortageOrSurplus}`
                        : translateText("Balanced")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Assigned")}</div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">{metrics.available}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Working Today")}</div>
                      <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">{metrics.workingToday}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Required")}</div>
                      <div className="text-sm font-black text-amber-700 dark:text-amber-400">{metrics.hasPlan ? metrics.required : "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staff Roster List */}
          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{translateText("Active Employee Roster (")}{filteredStaff.length})</span>
              </h3>
              <button
                onClick={() => { setStaffLocation(selectedLocation === 'all' || selectedLocation === 'personal' ? '' : selectedLocation); setShowAddStaffModal(true); }}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{translateText("Add Member")}</span>
              </button>
            </div>

            {filteredStaff.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-slate-100 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('noStaffWorkspace')}</div>
                <p className="text-[11px] text-slate-500">{translateText("Click \"Add Staff\" to register team members for Jain Sweets, Paan Bai, Kesarwadi, or Gopal Caterers.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStaff.map((member) => {
                  const locationBiz = BUSINESSES[member.assignedLocation || member.businessId];

                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{member.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              {member.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{locationBiz?.name}</span>
                            <span>•</span>
                            <span>{member.department || 'General'}</span>
                          </div>
                        </div>

                        {member.phone && (
                          <button
                            onClick={() => androidAutomation.initiatePhoneCall(member.phone)}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 transition"
                            title={translateText("Call Employee")}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block">{translateText("Salary Structure:")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            ₹{member.salaryAmount} / {member.salaryCycle}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{translateText("Weekly Off:")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{member.weeklyOff || translateText('Not set')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{translateText("Overtime Rate:")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{member.overtimeRate === undefined ? translateText('Not set') : `₹${member.overtimeRate}/hr`}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{translateText("Advance Balance:")}</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">₹{member.advanceBalance || 0}</span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                        <button
                          onClick={() => {
                            setAdvStaffId(member.id);
                            setShowAdvanceModal(true);
                          }}
                          className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{translateText("Advance / Cash")}</span>
                        </button>

                        <button
                          onClick={() => {
                            setTransferStaffId(member.id);
                            setShowTransferModal(true);
                          }}
                          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{translateText("Transfer")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transfer History Log */}
          {scopedTransfers.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>{translateText("Recent Location Transfer History")}</span>
              </h4>
              <div className="space-y-2">
                {scopedTransfers.slice(0, 5).map((t) => {
                  const fromBiz = BUSINESSES[t.fromBusinessId];
                  const toBiz = BUSINESSES[t.toBusinessId];
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{t.staffName}</span>
                        <span className="text-slate-500 dark:text-slate-400 mx-2">{translateText("transferred from") + " "}<strong className="text-amber-700 dark:text-amber-400">{fromBiz?.name}</strong>{" " + translateText("to")}{' '}
                          <strong className="text-emerald-700 dark:text-emerald-400">{toBiz?.name}</strong>
                        </span>
                        {t.notes && <span className="text-slate-500 italic block text-[11px]">{t.notes}</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{t.transferDate}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANPOWER PLANNING & CATERING CALCULATOR */}
      {activeTab === 'planning' && (
        <div className="space-y-5">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400">{translateText("Manpower Requirements & Catering Planning")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{translateText("Set staffing benchmarks per shift & calculate catering team sizes.")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPlanLocation(selectedLocation === 'all' || selectedLocation === 'personal' ? '' : selectedLocation); setShowManpowerModal(true); }}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{translateText("Config Manpower")}</span>
              </button>
              <button
                onClick={() => setShowCateringModal(true)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110"
              >
                <ChefHat className="w-4 h-4" />
                <span>{translateText("Gopal Caterers Event Calc")}</span>
              </button>
            </div>
          </div>

          {/* Manpower Benchmarks Table */}
          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span>{translateText("Location Staffing Benchmarks & Gap Analysis")}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <th className="py-2 px-3">{translateText("Business Workspace")}</th>
                    <th className="py-2 px-3">{translateText("Department")}</th>
                    <th className="py-2 px-3">{translateText("Shift")}</th>
                    <th className="py-2 px-3">{translateText("Required")}</th>
                    <th className="py-2 px-3">{translateText("Assigned")}</th>
                    <th className="py-2 px-3">{translateText("Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scopedPlans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 italic text-xs">{translateText("No custom manpower benchmarks configured yet. Click \"Config Manpower\" to define targets.")}</td>
                    </tr>
                  ) : (
                    scopedPlans.map((mp) => {
                      const biz = BUSINESSES[mp.businessId];
                      const assignedCount = staffList.filter(
                        (s) => s.assignedLocation === mp.businessId && (s.department === mp.department || !mp.department)
                      ).length;
                      const diff = assignedCount - mp.requiredCount;

                      return (
                        <tr key={mp.id} className="hover:bg-slate-100 dark:hover:bg-slate-950/40">
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">{biz?.name}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{mp.department}</td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{mp.shift}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-700 dark:text-amber-400">{mp.requiredCount}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">{assignedCount}</td>
                          <td className="py-2.5 px-3">
                            {diff < 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-extrabold text-[10px] border border-rose-500/30">{translateText("Shortage:") + " "}{Math.abs(diff)}
                              </span>
                            ) : diff > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30">{translateText("Surplus: +")}{diff}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">{translateText("Optimal")}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gopal Caterers Event Calculator Section */}
          <div className="bg-gradient-to-br from-purple-50 via-white to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-500/30 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-purple-400" />
                  <span>{translateText("Gopal Caterers — Event Staff Requirement Calculator")}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{translateText("Automated catering staff formulation based on guest count & service standards.")}</p>
              </div>

              <button
                onClick={() => setShowCateringModal(true)}
                className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
              >{translateText("+ Add Catering Event")}</button>
            </div>

            {/* Catering Events List */}
            {scopedEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-100 dark:bg-slate-950/40 border border-dashed border-purple-900/50 space-y-2">
                <ChefHat className="w-8 h-8 text-purple-400 mx-auto opacity-70" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{translateText("No active catering events scheduled")}</div>
                <p className="text-[11px] text-slate-500">{translateText("Enter guest count (e.g. 250 guests) to automatically calculate required waiters, cooks & supervisors.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scopedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-purple-500/20 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          {evt.eventDate}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{evt.eventName}</h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{evt.location}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">{translateText("Guest Count")}</div>
                        <div className="text-base font-black text-amber-700 dark:text-amber-400">{evt.guestCount}{" " + translateText("Pax")}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-900/30 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Waiters Needed")}</div>
                        <div className="font-extrabold text-purple-700 dark:text-purple-300">{evt.requiredWaiters}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Cooks Needed")}</div>
                        <div className="font-extrabold text-purple-700 dark:text-purple-300">{evt.requiredCooks}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("Supervisors")}</div>
                        <div className="font-extrabold text-purple-700 dark:text-purple-300">{evt.requiredSupervisors}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>{translateText("Total Team Required:") + " "}{evt.requiredWaiters + evt.requiredCooks + evt.requiredSupervisors}{" " + translateText("staff")}</span>
                      <button
                        onClick={async () => {
                          await db.deleteCateringEvent(evt.id);
                        }}
                        className="text-rose-400 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{translateText("Delete")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE & OVERTIME */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400">{translateText("Daily Attendance & Overtime Logger")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{translateText("Record daily check-ins, overtime hours & weekly offs.")}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{translateText("Select Date:")}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-400"
              />
            </div>
          </div>

          {/* Attendance Roster */}
          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
            {filteredStaff.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">{translateText("No staff members found for selected workspace filter.")}</div>
            ) : (
              filteredStaff.map((member) => {
                const att = attendanceList.find((a) => a.staffId === member.id && a.date === selectedDate);
                const currentStatus = att?.status || 'absent';
                const overtime = att?.overtimeHours || 0;

                return (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{member.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400">
                          {member.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{translateText("Shift:") + " "}{member.shift || 'Full Day'}{" " + translateText("• Overtime Rate: ₹")}{member.overtimeRate || 0}{translateText("/hr")}</div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleRecordAttendance(member, 'present', overtime)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          currentStatus === 'present'
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-emerald-400'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{translateText("Present")}</span>
                      </button>

                      <button
                        onClick={() => handleRecordAttendance(member, 'half_day', overtime)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          currentStatus === 'half_day'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-amber-400'
                        }`}
                      >
                        <span>{translateText("Half Day")}</span>
                      </button>

                      <button
                        onClick={() => handleRecordAttendance(member, 'extra_shift', overtime)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          currentStatus === 'extra_shift'
                            ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-purple-400'
                        }`}
                      >
                        <span>{translateText("Extra Shift")}</span>
                      </button>

                      <button
                        onClick={() => handleRecordAttendance(member, 'weekly_off', overtime)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          currentStatus === 'weekly_off'
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-blue-400'
                        }`}
                      >
                        <span>{translateText("Weekly Off")}</span>
                      </button>

                      <button
                        onClick={() => handleRecordAttendance(member, 'absent', overtime)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          currentStatus === 'absent'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-rose-400'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{translateText("Absent")}</span>
                      </button>

                      {/* Overtime input */}
                      <div className="flex items-center gap-1 ml-2 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{translateText("OT (hrs):")}</span>
                        <input
                          type="number"
                          min="0"
                          max="12"
                          value={overtime || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleRecordAttendance(member, currentStatus, val);
                          }}
                          placeholder="0"
                          className="w-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs text-amber-700 dark:text-amber-400 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL & SALARY STATEMENTS */}
      {activeTab === 'payroll' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400">{translateText("Monthly Payroll & Salary Statements")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{translateText("Automated rule-based salary calculation & owner confirmation modal.")}</p>
            </div>

            <button
              onClick={() => setShowAdvanceModal(true)}
              className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translateText("Record Advance / Deduction")}</span>
            </button>
          </div>

          {payrollError && !showSalaryConfirmModal && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{payrollError}</p>}
          {/* Staff Payroll Calculator Cards */}
          <div className="space-y-3">
            {filteredStaff.map((member) => {
              const currentMonth = selectedDate.substring(0, 7); // YYYY-MM
              const paidSalary = salaryRecords.find(
                (s) => s.staffId === member.id && s.period === currentMonth
              );

              return (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{member.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{translateText("Cycle:") + " "}<strong>{member.salaryCycle}</strong> (₹{member.salaryAmount}{translateText(") • Advance Balance:") + " "}<strong className="text-amber-700 dark:text-amber-400">₹{member.advanceBalance || 0}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {paidSalary ? (
                      <div className="text-right">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{translateText("Paid: ₹")}{paidSalary.netPaid} ({paidSalary.period})</span>
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => prepareSalaryCalculation(member, currentMonth)}
                        className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition"
                      >{translateText("Calculate & Clear Salary")}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Salary Payments Log */}
          {scopedSalaries.length > 0 && (
            <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{translateText("Recorded Salary Payment History")}</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-3">{translateText("Staff Name")}</th>
                      <th className="py-2 px-3">{translateText("Period")}</th>
                      <th className="py-2 px-3">{translateText("Base Pay")}</th>
                      <th className="py-2 px-3">{translateText("OT Pay")}</th>
                      <th className="py-2 px-3">{translateText("Advance Deducted")}</th>
                      <th className="py-2 px-3">{translateText("Net Paid")}</th>
                      <th className="py-2 px-3">{translateText("Date & Method")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {scopedSalaries.map((sal) => (
                      <tr key={sal.id} className="hover:bg-slate-100 dark:hover:bg-slate-950/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{sal.staffName || 'Staff'}</td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{sal.period}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">₹{sal.amount}</td>
                        <td className="py-2.5 px-3 text-amber-700 dark:text-amber-400">₹{sal.overtimePay || 0}</td>
                        <td className="py-2.5 px-3 text-rose-400">₹{sal.advanceDeducted}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-700 dark:text-emerald-400">₹{sal.netPaid}</td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {sal.date} ({sal.paymentMethod.toUpperCase()})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddStaffSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{translateText("Register New Employee Profile")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Full Name*")}</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder={translateText("e.g. Ramesh Kumar")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Phone Number")}</label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder={translateText("e.g. +91 9876543210")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Assigned Location")}</label>
                <select
                  required
                  value={staffLocation}
                  onChange={(e) => setStaffLocation(e.target.value as BusinessId)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="" disabled>{translateText("Choose workspace")}</option>
                  {businessLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {translateText(BUSINESSES[loc].name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Role / Designation")}</label>
                <input
                  type="text"
                  required
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  placeholder={translateText("e.g. Chef / Helper / Cashier")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Department")}</label>
                <select
                  value={staffDepartment}
                  onChange={(e) => setStaffDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="Kitchen">{translateText("Kitchen")}</option>
                  <option value="Counter">{translateText("Counter")}</option>
                  <option value="Service">{translateText("Service")}</option>
                  <option value="Cleaning">{translateText("Cleaning")}</option>
                  <option value="Management">{translateText("Management")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Shift")}</label>
                <select
                  value={staffShift}
                  onChange={(e) => setStaffShift(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="Full Day">{translateText("Full Day")}</option>
                  <option value="Morning">{translateText("Morning")}</option>
                  <option value="Evening">{translateText("Evening")}</option>
                  <option value="Night">{translateText("Night")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Salary Amount (₹)")}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={staffSalary}
                  onChange={(e) => setStaffSalary(e.target.value)}
                  placeholder={translateText("e.g. 18000")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Salary Cycle")}</label>
                <select
                  value={staffCycle}
                  onChange={(e) => setStaffCycle(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="monthly">{translateText("Monthly")}</option>
                  <option value="daily">{translateText("Daily Wager")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Weekly Off Day")}</label>
                <select
                  value={staffWeeklyOff}
                  onChange={(e) => setStaffWeeklyOff(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="">{translateText("Not set")}</option>
                  <option value="Sunday">{translateText("Sunday")}</option>
                  <option value="Monday">{translateText("Monday")}</option>
                  <option value="Tuesday">{translateText("Tuesday")}</option>
                  <option value="Wednesday">{translateText("Wednesday")}</option>
                  <option value="Thursday">{translateText("Thursday")}</option>
                  <option value="Friday">{translateText("Friday")}</option>
                  <option value="Saturday">{translateText("Saturday")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Overtime Rate (₹/hr)")}</label>
                <input
                  type="number"
                  value={staffOvertimeRate}
                  onChange={(e) => setStaffOvertimeRate(e.target.value)}
                  placeholder={translateText("e.g. 50")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs hover:brightness-110"
              >{translateText("Save Employee")}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: TRANSFER STAFF MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleTransferSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span>{translateText("Transfer Employee Location")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Select Staff Member*")}</label>
                <select
                  required
                  value={transferStaffId}
                  onChange={(e) => setTransferStaffId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="">{translateText("-- Choose Employee --")}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({translateText(BUSINESSES[s.assignedLocation]?.name || s.assignedLocation)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Transfer To Location*")}</label>
                <select
                  value={transferTargetLocation}
                  onChange={(e) => setTransferTargetLocation(e.target.value as BusinessId)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  {businessLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {translateText(BUSINESSES[loc].name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Reason / Notes")}</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder={translateText("e.g. Festival rush requirement")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110"
              >{translateText("Confirm Transfer")}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: MANPOWER BENCHMARK CONFIG MODAL */}
      {showManpowerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManpowerSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                <span>{translateText("Configure Location Staffing Benchmark")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManpowerModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Business Workspace")}</label>
                <select
                  required
                  value={planLocation}
                  onChange={(e) => setPlanLocation(e.target.value as BusinessId)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="" disabled>{translateText("Choose workspace")}</option>
                  {businessLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {translateText(BUSINESSES[loc].name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Department")}</label>
                <select
                  value={planDepartment}
                  onChange={(e) => setPlanDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="Kitchen">{translateText("Kitchen")}</option>
                  <option value="Counter">{translateText("Counter")}</option>
                  <option value="Service">{translateText("Service")}</option>
                  <option value="Cleaning">{translateText("Cleaning")}</option>
                  <option value="Management">{translateText("Management")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Shift")}</label>
                <select
                  value={planShift}
                  onChange={(e) => setPlanShift(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="Full Day">{translateText("Full Day")}</option>
                  <option value="Morning">{translateText("Morning")}</option>
                  <option value="Evening">{translateText("Evening")}</option>
                  <option value="Night">{translateText("Night")}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Required Employee Count*")}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={planRequiredCount}
                  onChange={(e) => setPlanRequiredCount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowManpowerModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110"
              >{translateText("Save Benchmark")}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: GOPAL CATERERS EVENT CALCULATOR MODAL */}
      {showCateringModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCateringSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-purple-500/40 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
              <h3 className="text-sm font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-purple-400" />
                <span>{translateText("Gopal Caterers — Catering Event Calculator")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCateringModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Event Name*")}</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={translateText("e.g. Grand Wedding Banquet")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Event Date")}</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Venue / Location")}</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder={translateText("e.g. Royal Palace Hall")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Total Guest Count (Pax)*")}</label>
                <input
                  type="number"
                  required
                  min="10"
                  value={eventGuests}
                  onChange={(e) => setEventGuests(e.target.value)}
                  placeholder={translateText("e.g. 250")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-purple-700 dark:text-purple-300 font-bold focus:border-purple-400"
                />
              </div>
            </div>

            {/* Calculated Breakdown Display */}
            {parseInt(eventGuests, 10) > 0 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-500/30 space-y-1">
                <div className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{translateText("Automated Staff Formulation:")}</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Waiters (1:25)")}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {Math.max(2, Math.ceil((parseInt(eventGuests, 10) || 0) / 25))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Cooks (1:75)")}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {Math.max(1, Math.ceil((parseInt(eventGuests, 10) || 0) / 75))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{translateText("Supervisors (1:150)")}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {Math.max(1, Math.ceil((parseInt(eventGuests, 10) || 0) / 150))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCateringModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500"
              >{translateText("Save Catering Schedule")}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: RECORD ADVANCE / DEDUCTION MODAL */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdvanceSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{translateText("Record Staff Advance or Deduction")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Employee*")}</label>
                <select
                  required
                  value={advStaffId}
                  onChange={(e) => setAdvStaffId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                >
                  <option value="">{translateText("-- Choose Employee --")}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{" " + translateText("(Current Advance: ₹")}{s.advanceBalance || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Transaction Type")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdvType('advance')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      advType === 'advance'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >{translateText("Give Advance Cash")}</button>
                  <button
                    type="button"
                    onClick={() => setAdvType('deduction')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      advType === 'deduction'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >{translateText("Special Deduction")}</button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Amount (₹)*")}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  placeholder={translateText("e.g. 2000")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Notes / Reason")}</label>
                <input
                  type="text"
                  value={advNotes}
                  onChange={(e) => setAdvNotes(e.target.value)}
                  placeholder={translateText("e.g. Medical emergency advance")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
                />
              </div>
            </div>

            {advanceError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{advanceError}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110"
              >{translateText("Record Cash Transaction")}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: OWNER CONFIRMATION MODAL BEFORE PAYROLL SALARY PAYMENT */}
      {showSalaryConfirmModal && pendingPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">{translateText("Owner Payroll Confirmation")}</h3>
              </div>
              <button
                onClick={() => setShowSalaryConfirmModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{pendingPayroll.staff.name}</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{pendingPayroll.period}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{translateText("Designation:") + " "}{pendingPayroll.staff.role}{" " + translateText("• Location:")}{' '}
                {translateText(BUSINESSES[pendingPayroll.staff.assignedLocation]?.name || pendingPayroll.staff.assignedLocation)}
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="space-y-2 text-xs bg-slate-100 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">{translateText("Present / Days Worked:")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pendingPayroll.daysPresent}{" " + translateText("days")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">{translateText("Half Days Worked:")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pendingPayroll.daysHalfDay}{" " + translateText("days")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">{translateText("Base Salary Earned:")}</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{pendingPayroll.baseEarnings}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">{translateText("Overtime Earnings:")}</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">+ ₹{pendingPayroll.overtimeEarnings}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">{translateText("Advance Deducted:")}</span>
                <span className="font-bold text-rose-400">- ₹{pendingPayroll.totalAdvancesDeducted}</span>
              </div>

              <div className="flex justify-between py-2 border-t border-slate-300 dark:border-slate-700 text-sm font-black pt-2">
                <span className="text-amber-700 dark:text-amber-400">{translateText("Net Payable Amount:")}</span>
                <span className="text-emerald-700 dark:text-emerald-400">₹{pendingPayroll.netPayable}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">{translateText("Payment Method")}</label>
              <select
                value={pendingPayroll.paymentMethod}
                onChange={(e) =>
                  setPendingPayroll({
                    ...pendingPayroll,
                    paymentMethod: e.target.value as any
                  })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-400"
              >
                <option value="cash">{translateText("Cash")}</option>
                <option value="upi">{translateText("UPI / Online")}</option>
                <option value="bank">{translateText("Bank Transfer")}</option>
              </select>
            </div>

            {/* Confirmation Buttons */}
            <p className="text-xs text-slate-500">{translateText("This records a payment already made; it does not transfer money.")}</p>
            {payrollError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{payrollError}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSalaryConfirmModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >{translateText("Cancel")}</button>
              <button
                type="button"
                onClick={confirmSalaryPayment}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 shadow-lg shadow-emerald-500/20"
              disabled={payrollSaving}
              >{translateText("Confirm & Record ₹")}{pendingPayroll.netPayable}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
