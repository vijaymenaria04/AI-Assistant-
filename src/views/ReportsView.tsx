import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Layers,
  Calendar,
  Filter,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Truck,
  BarChart2,
  PieChart as PieIcon,
  Users,
  ChefHat,
  PackageCheck,
  Share2,
  Image as ImageIcon,
  Bot,
  Search,
  CheckCircle2,
  Briefcase,
  Sparkles,
  FileSpreadsheet,
  ArrowDownLeft
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

import { db } from '../services/db';
import {
  BusinessId,
  BUSINESSES,
  Sale,
  Expense,
  Purchase,
  InventoryItem,
  Supplier,
  SupplierPayment,
  Receivable,
  PersonalTransaction,
  StockMovement,
  Staff,
  Attendance,
  SalaryRecord,
  ManpowerPlan,
  CateringOrder
} from '../types/database';
import { useTranslation } from '../services/i18n';

interface ReportsViewProps {
  currentBusinessId?: BusinessId;
}

type DatePeriod = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
type WorkspaceFilter = 'combined' | BusinessId | 'personal';
type PaymentMethodFilter = 'all' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';

export const ReportsView: React.FC<ReportsViewProps> = ({ currentBusinessId = 'jain-sweets' }) => {
  const { t } = useTranslation();

  // Raw Database Collections
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [personalTxs, setPersonalTxs] = useState<PersonalTransaction[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [manpowerPlans, setManpowerPlans] = useState<ManpowerPlan[]>([]);
  const [cateringOrders, setCateringOrders] = useState<CateringOrder[]>([]);

  // Selection Filter States
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceFilter>('combined');
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Analytics State
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<{ query: string; answer: string; insights: string[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Chart Container Refs for PNG Export
  const salesChartRef = useRef<HTMLDivElement>(null);
  const incomeExpenseChartRef = useRef<HTMLDivElement>(null);
  const paymentMethodChartRef = useRef<HTMLDivElement>(null);
  const stockChartRef = useRef<HTMLDivElement>(null);
  const staffGapChartRef = useRef<HTMLDivElement>(null);
  const cateringChartRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const s = await db.getSales();
    const e = await db.getExpenses();
    const p = await db.getPurchases();
    const i = await db.getInventory();
    const sup = await db.getSuppliers();
    const sp = await db.getSupplierPayments();
    const rec = await db.getReceivables();
    const ptx = await db.getPersonalTransactions();
    const sm = await db.getStockMovements();
    const st = await db.getStaff();
    const att = await db.getAttendance();
    const sal = await db.getSalaries();
    const mp = await db.getManpowerPlans();
    const cat = await db.getCateringOrders();

    setSales(s);
    setExpenses(e);
    setPurchases(p);
    setInventory(i);
    setSuppliers(sup);
    setSupplierPayments(sp);
    setReceivables(rec);
    setPersonalTxs(ptx);
    setStockMovements(sm);
    setStaffList(st);
    setAttendanceList(att);
    setSalaryRecords(sal);
    setManpowerPlans(mp);
    setCateringOrders(cat);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Filter helper by date
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const now = new Date();

    if (datePeriod === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return dateStr.startsWith(todayStr);
    } else if (datePeriod === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo && itemDate <= now;
    } else if (datePeriod === 'month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    } else if (datePeriod === 'year') {
      return itemDate.getFullYear() === now.getFullYear();
    } else if (datePeriod === 'custom') {
      if (startDate && new Date(dateStr) < new Date(startDate)) return false;
      if (endDate && new Date(dateStr) > new Date(endDate + 'T23:59:59')) return false;
      return true;
    }
    return true; // 'all'
  };

  // Filter helper by payment method
  const matchesPaymentMethod = (method?: string) => {
    if (paymentMethodFilter === 'all') return true;
    if (!method) return false;
    const m = method.toLowerCase();
    const target = paymentMethodFilter.toLowerCase();

    if (target === 'bank transfer') {
      return m === 'bank' || m === 'online' || m === 'bank transfer';
    }
    return m === target;
  };

  // Filtered collections based on workspace, date & payment method
  const filteredSales = sales.filter((s) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && s.businessId !== selectedWorkspace) return false;
    if (!isDateInRange(s.date)) return false;
    if (!matchesPaymentMethod(s.paymentMethod)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const firstItemName = s.items?.[0]?.itemName || '';
      return (
        firstItemName.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.amount.toString().includes(q)
      );
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && e.businessId !== selectedWorkspace) return false;
    if (!isDateInRange(e.date)) return false;
    if (!matchesPaymentMethod(e.paymentMethod)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleText = e.notes || e.category;
      return (
        titleText.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.amount.toString().includes(q)
      );
    }
    return true;
  });

  const filteredPurchases = purchases.filter((p) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && p.businessId !== selectedWorkspace) return false;
    if (!isDateInRange(p.date)) return false;
    return true;
  });

  const filteredSupplierPayments = supplierPayments.filter((sp) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && sp.businessId !== selectedWorkspace) return false;
    if (!isDateInRange(sp.date)) return false;
    if (!matchesPaymentMethod(sp.paymentMethod)) return false;
    return true;
  });

  const filteredPersonalTxs = personalTxs.filter((pt) => {
    if (selectedWorkspace !== 'combined' && selectedWorkspace !== 'personal') return false;
    if (!isDateInRange(pt.date)) return false;
    if (!matchesPaymentMethod(pt.paymentMethod)) return false;
    return true;
  });

  const filteredCateringOrders = cateringOrders.filter((co) => {
    if (selectedWorkspace !== 'combined' && selectedWorkspace !== 'gopal-caterers') return false;
    if (!isDateInRange(co.eventDate)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        co.customerName.toLowerCase().includes(q) ||
        co.eventType.toLowerCase().includes(q) ||
        co.venue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredInventory = inventory.filter((item) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && item.businessId !== selectedWorkspace) return false;
    return true;
  });

  const filteredReceivables = receivables.filter((r) => {
    if (selectedWorkspace === 'personal') return false;
    if (selectedWorkspace !== 'combined' && r.businessId !== selectedWorkspace) return false;
    return true;
  });

  // Totals calculations
  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPurchasesAmount = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);
  const totalSupplierPaidAmount = filteredSupplierPayments.reduce((sum, sp) => sum + sp.amount, 0);

  const personalIncomeAmount = filteredPersonalTxs
    .filter((pt) => pt.type === 'income')
    .reduce((sum, pt) => sum + pt.amount, 0);

  const personalExpenseAmount = filteredPersonalTxs
    .filter((pt) => pt.type === 'expense')
    .reduce((sum, pt) => sum + pt.amount, 0);

  const pendingReceivablesTotal = filteredReceivables
    .filter((r) => r.status === 'unpaid' || r.status === 'partial')
    .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

  const pendingPayablesTotal = suppliers.reduce((sum, s) => sum + (s.totalPayable || 0), 0);

  // CHART 1: Sales Revenue Trend
  const salesTrendMap: Record<string, number> = {};
  filteredSales.forEach((s) => {
    salesTrendMap[s.date] = (salesTrendMap[s.date] || 0) + s.amount;
  });
  const salesTrendData = Object.keys(salesTrendMap)
    .sort()
    .map((date) => ({
      date,
      Sales: salesTrendMap[date]
    }));

  // CHART 2: Income vs Expense Trend
  const incomeExpenseDates = Array.from(
    new Set([...filteredSales.map((s) => s.date), ...filteredExpenses.map((e) => e.date)])
  ).sort();

  const incomeExpenseData = incomeExpenseDates.map((date) => {
    const daySales = filteredSales.filter((s) => s.date === date).reduce((sum, s) => sum + s.amount, 0);
    const dayExpenses = filteredExpenses.filter((e) => e.date === date).reduce((sum, e) => sum + e.amount, 0);
    return {
      date,
      SalesIncome: daySales,
      Expenses: dayExpenses
    };
  });

  // CHART 3: Cash / UPI / Bank Breakdown
  const paymentMethodMap: Record<string, number> = {
    Cash: 0,
    UPI: 0,
    'Bank Transfer': 0,
    Credit: 0
  };
  filteredSales.forEach((s) => {
    const mode = s.paymentMethod || 'cash';
    let key = 'Cash';
    if (mode === 'upi' || mode === 'online') key = 'UPI';
    else if (mode === 'credit') key = 'Credit';
    paymentMethodMap[key] = (paymentMethodMap[key] || 0) + s.amount;
  });
  const paymentMethodData = Object.keys(paymentMethodMap)
    .filter((k) => paymentMethodMap[k] > 0)
    .map((k) => ({
      name: k,
      value: paymentMethodMap[k]
    }));

  const MODE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

  // CHART 4: Inventory Low Stock Items
  const lowStockItems = filteredInventory.filter((item) => item.stockQuantity <= item.minStockLevel);
  const stockOverviewData = filteredInventory.slice(0, 8).map((item) => ({
    name: item.name,
    CurrentStock: item.stockQuantity,
    MinRequired: item.minStockLevel
  }));

  // CHART 5: Staff Allocation & Manpower Gap
  const staffLocationMap: Record<string, number> = {};
  staffList.forEach((s) => {
    const locName = BUSINESSES[s.assignedLocation || s.businessId]?.name || 'Unassigned';
    staffLocationMap[locName] = (staffLocationMap[locName] || 0) + 1;
  });

  const manpowerGapData = ['jain-sweets', 'paan-bai', 'kesarwadi', 'gopal-caterers'].map((locKey) => {
    const bizName = BUSINESSES[locKey as BusinessId]?.name || locKey;
    const assigned = staffList.filter((s) => (s.assignedLocation || s.businessId) === locKey).length;
    const required = manpowerPlans
      .filter((mp) => mp.businessId === locKey)
      .reduce((sum, item) => sum + item.requiredCount, 0);

    return {
      location: bizName,
      Required: required,
      Assigned: assigned,
      Shortage: Math.max(0, required - assigned)
    };
  });

  // CHART 6: Gopal Caterers Booking Trend
  const cateringOrderTrendMap: Record<string, { Revenue: number; Orders: number }> = {};
  filteredCateringOrders.forEach((co) => {
    if (!cateringOrderTrendMap[co.eventDate]) {
      cateringOrderTrendMap[co.eventDate] = { Revenue: 0, Orders: 0 };
    }
    cateringOrderTrendMap[co.eventDate].Revenue += co.totalAmount;
    cateringOrderTrendMap[co.eventDate].Orders += 1;
  });
  const cateringTrendData = Object.keys(cateringOrderTrendMap)
    .sort()
    .map((d) => ({
      date: d,
      Revenue: cateringOrderTrendMap[d].Revenue,
      Orders: cateringOrderTrendMap[d].Orders
    }));

  // EXPORT: PDF Generation
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header Title
    doc.setFontSize(18);
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('GopalAI Assistant - Operations & Analytics Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const workspaceName =
      selectedWorkspace === 'combined'
        ? 'All Businesses Consolidated'
        : selectedWorkspace === 'personal'
        ? 'Personal Finance'
        : BUSINESSES[selectedWorkspace]?.name || selectedWorkspace;

    doc.text(`Workspace: ${workspaceName} | Filter Period: ${datePeriod.toUpperCase()}`, 14, 27);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 33);

    // Summary KPIs Box
    autoTable(doc, {
      startY: 38,
      head: [['Metric', 'Value (INR / Count)']],
      body: [
        ['Total Sales Revenue', `Rs. ${totalSalesAmount.toLocaleString('en-IN')}`],
        ['Operating Expenses', `Rs. ${totalExpensesAmount.toLocaleString('en-IN')}`],
        ['Stock Purchases', `Rs. ${totalPurchasesAmount.toLocaleString('en-IN')}`],
        ['Supplier Payments Disbursed', `Rs. ${totalSupplierPaidAmount.toLocaleString('en-IN')}`],
        ['Pending Customer Receivables', `Rs. ${pendingReceivablesTotal.toLocaleString('en-IN')}`],
        ['Pending Supplier Payables', `Rs. ${pendingPayablesTotal.toLocaleString('en-IN')}`],
        ['Low Stock Alert Items Count', `${lowStockItems.length} items`],
        ['Active Staff Members', `${staffList.length} employees`],
        ['Gopal Caterers Bookings', `${filteredCateringOrders.length} events`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] }
    });

    // Recent Sales Transactions Table
    const lastDocY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text('Recent Sales Records', 14, lastDocY + 12);

    const salesTableBody = filteredSales.slice(0, 15).map((s) => [
      s.date,
      BUSINESSES[s.businessId]?.name || s.businessId,
      s.items?.[0]?.itemName || 'General Sale',
      s.items?.reduce((acc, i) => acc + i.quantity, 0) || 1,
      s.paymentMethod || 'cash',
      `Rs. ${s.amount.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: lastDocY + 16,
      head: [['Date', 'Business', 'Item/Product', 'Qty', 'Mode', 'Amount']],
      body: salesTableBody.length > 0 ? salesTableBody : [['-', '-', 'No sales records for selected filter', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Recent Expenses Table
    const expDocY = (doc as any).lastAutoTable.finalY || 180;
    if (expDocY < 240) {
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text('Operating Expense Records', 14, expDocY + 12);

      const expTableBody = filteredExpenses.slice(0, 10).map((e) => [
        e.date,
        BUSINESSES[e.businessId]?.name || e.businessId,
        e.notes || e.category,
        e.category,
        e.paymentMethod || 'cash',
        `Rs. ${e.amount.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: expDocY + 16,
        head: [['Date', 'Business', 'Title/Notes', 'Category', 'Mode', 'Amount']],
        body: expTableBody.length > 0 ? expTableBody : [['-', '-', 'No expense records found', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] }
      });
    }

    doc.save(`GopalAI_Report_${selectedWorkspace}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // EXPORT: Excel Workbook (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    const summaryData = [
      { Metric: 'Workspace', Value: selectedWorkspace },
      { Metric: 'Period', Value: datePeriod },
      { Metric: 'Total Sales Revenue (INR)', Value: totalSalesAmount },
      { Metric: 'Operating Expenses (INR)', Value: totalExpensesAmount },
      { Metric: 'Stock Purchases (INR)', Value: totalPurchasesAmount },
      { Metric: 'Supplier Disbursed (INR)', Value: totalSupplierPaidAmount },
      { Metric: 'Pending Receivables (INR)', Value: pendingReceivablesTotal },
      { Metric: 'Pending Payables (INR)', Value: pendingPayablesTotal },
      { Metric: 'Low Stock Alert Count', Value: lowStockItems.length },
      { Metric: 'Active Employees', Value: staffList.length },
      { Metric: 'Catering Events Booked', Value: filteredCateringOrders.length }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Sales
    if (filteredSales.length > 0) {
      const salesExport = filteredSales.map((s) => ({
        ID: s.id,
        Date: s.date,
        Business: BUSINESSES[s.businessId]?.name || s.businessId,
        Product: s.items?.[0]?.itemName || 'General Sale',
        Quantity: s.items?.reduce((acc, i) => acc + i.quantity, 0) || 1,
        PaymentMethod: s.paymentMethod || 'cash',
        Customer: s.customerName || '',
        Amount: s.amount
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesExport);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');
    }

    // Sheet 3: Expenses
    if (filteredExpenses.length > 0) {
      const expensesExport = filteredExpenses.map((e) => ({
        ID: e.id,
        Date: e.date,
        Business: BUSINESSES[e.businessId]?.name || e.businessId,
        Notes: e.notes || e.category,
        Category: e.category,
        PaymentMethod: e.paymentMethod || 'cash',
        Amount: e.amount
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(expensesExport);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');
    }

    // Sheet 4: Inventory
    if (filteredInventory.length > 0) {
      const inventoryExport = filteredInventory.map((i) => ({
        ID: i.id,
        Business: BUSINESSES[i.businessId]?.name || i.businessId,
        Name: i.name,
        Quantity: i.stockQuantity,
        Unit: i.unit,
        MinStockLevel: i.minStockLevel,
        Status: i.stockQuantity <= i.minStockLevel ? 'LOW STOCK' : 'Normal'
      }));
      const wsInventory = XLSX.utils.json_to_sheet(inventoryExport);
      XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');
    }

    // Write file
    XLSX.writeFile(wb, `GopalAI_Analytics_${selectedWorkspace}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT: Download Chart as PNG
  const handleDownloadChartPNG = async (chartRef: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#0f172a'
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `GopalAI_${title.replace(/\s+/g, '_')}_Chart.png`;
      link.click();
    } catch (err) {
      console.error('Error downloading chart image:', err);
    }
  };

  // EXPORT: Web Share
  const handleShareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GopalAI Business Analytics Report',
          text: `GopalAI Operations Summary:\nSales: Rs. ${totalSalesAmount}\nExpenses: Rs. ${totalExpensesAmount}\nPending Receivables: Rs. ${pendingReceivablesTotal}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share dismissed', err);
      }
    } else {
      navigator.clipboard.writeText(
        `GopalAI Operations Summary:\nSales: Rs. ${totalSalesAmount}\nExpenses: Rs. ${totalExpensesAmount}\nPending Receivables: Rs. ${pendingReceivablesTotal}`
      );
      alert('Report summary copied to clipboard!');
    }
  };

  // AI Analytics Query Execution
  const handleAskGopalAI = (queryText: string) => {
    setAiQuestion(queryText);
    setIsAiLoading(true);

    setTimeout(() => {
      const q = queryText.toLowerCase();
      let answer = '';
      let insights: string[] = [];

      if (q.includes('highest sales') || q.includes('top business')) {
        const salesByBiz: Record<string, number> = {};
        sales.forEach((s) => {
          const name = BUSINESSES[s.businessId]?.name || s.businessId;
          salesByBiz[name] = (salesByBiz[name] || 0) + s.amount;
        });

        let topBiz = 'None';
        let maxSales = 0;
        Object.entries(salesByBiz).forEach(([biz, val]) => {
          if (val > maxSales) {
            maxSales = val;
            topBiz = biz;
          }
        });

        answer = `Top Business by Sales Revenue is "${topBiz}" with total recorded sales of ₹${maxSales.toLocaleString('en-IN')}.`;
        insights = [
          `Total business sales across all locations: ₹${sales.reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN')}`,
          `Consider increasing stock and high-demand inventory at ${topBiz}.`
        ];
      } else if (q.includes('spent') || q.includes('expense')) {
        answer = `Total expenses recorded for ${datePeriod.toUpperCase()} filter period amount to ₹${totalExpensesAmount.toLocaleString('en-IN')}.`;
        insights = [
          `Operating Expenses: ₹${totalExpensesAmount.toLocaleString('en-IN')}`,
          `Stock Purchases: ₹${totalPurchasesAmount.toLocaleString('en-IN')}`,
          `Supplier Payments Disbursed: ₹${totalSupplierPaidAmount.toLocaleString('en-IN')}`
        ];
      } else if (q.includes('restocking') || q.includes('stock') || q.includes('inventory')) {
        if (lowStockItems.length === 0) {
          answer = 'All inventory items across Jain Sweets, Paan Bai Canteen & Kesarwadi Canteen are currently at healthy stock levels above minimum thresholds.';
          insights = ['0 items need urgent reordering.'];
        } else {
          answer = `Found ${lowStockItems.length} inventory items requiring urgent restocking:`;
          insights = lowStockItems.map(
            (i) => `${i.name} (${BUSINESSES[i.businessId]?.name}): Current ${i.stockQuantity} ${i.unit} (Min: ${i.minStockLevel} ${i.unit})`
          );
        }
      } else if (q.includes('employee') || q.includes('staff')) {
        const totalReq = manpowerGapData.reduce((sum, m) => sum + m.Required, 0);
        const totalAssigned = manpowerGapData.reduce((sum, m) => sum + m.Assigned, 0);
        const shortage = Math.max(0, totalReq - totalAssigned);

        answer = `Currently ${staffList.length} total employees are registered. Required staffing total is ${totalReq}, assigned count is ${totalAssigned}, leaving a shortage of ${shortage} staff members.`;
        insights = manpowerGapData.map(
          (m) => `${m.location}: Assigned ${m.Assigned} / Required ${m.Required} ${m.Shortage > 0 ? `(Shortage: ${m.Shortage})` : '(Fully Staffed)'}`
        );
      } else if (q.includes('catering') || q.includes('orders')) {
        answer = `There are ${cateringOrders.length} total Gopal Caterers bookings on record, generating ₹${cateringOrders.reduce((a, b) => a + b.totalAmount, 0).toLocaleString('en-IN')} total order value.`;
        insights = cateringOrders.slice(0, 3).map((co) => `${co.customerName} - ${co.eventType} on ${co.eventDate} (${co.guestCount} guests)`);
      } else if (q.includes('pending') || q.includes('payment')) {
        answer = `Pending Receivables: ₹${pendingReceivablesTotal.toLocaleString('en-IN')} | Pending Supplier Payables: ₹${pendingPayablesTotal.toLocaleString('en-IN')}.`;
        insights = [
          `Collect pending customer payments from receivables tab.`,
          `Ensure supplier balance is cleared prior to upcoming stock deliveries.`
        ];
      } else {
        answer = `GopalAI Analytics Summary: Total Sales = ₹${totalSalesAmount.toLocaleString('en-IN')}, Expenses = ₹${totalExpensesAmount.toLocaleString('en-IN')}, Active Staff = ${staffList.length}, Low Stock Alerts = ${lowStockItems.length}.`;
        insights = ['Use workspace and date filters to drill down into specific business metrics.'];
      }

      setAiAnswer({ query: queryText, answer, insights });
      setIsAiLoading(false);
    }, 400);
  };

  return (
    <div className="p-4 space-y-5 max-w-6xl mx-auto pb-28 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header & Export Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-amber-500" />
            <span>Analytics & Reports Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            100% database-backed analytics, trends, manpower gaps, catering orders & export tools.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="py-2.5 px-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition active:scale-95"
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>PDF Report</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="py-2.5 px-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            onClick={handleShareReport}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR 1: Workspace Selector */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-1 whitespace-nowrap flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" /> Workspace:
          </span>

          <button
            onClick={() => setSelectedWorkspace('combined')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition ${
              selectedWorkspace === 'combined'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Consolidated (All Businesses)</span>
          </button>

          {Object.entries(BUSINESSES).map(([id, info]) => (
            <button
              key={id}
              onClick={() => setSelectedWorkspace(id as BusinessId)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition ${
                selectedWorkspace === id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>{info.name}</span>
            </button>
          ))}

          <button
            onClick={() => setSelectedWorkspace('personal')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition ${
              selectedWorkspace === 'personal'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Personal Finance</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR 2: Date Period & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Date Filter Range:</span>
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800">
              {(['today', 'week', 'month', 'year', 'all', 'custom'] as DatePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setDatePeriod(p)}
                  className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition ${
                    datePeriod === p
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : p === 'all' ? 'All Time' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, title..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {datePeriod === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <span className="font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>
        )}

        {/* Payment Method Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Payment Mode:</span>
          {(['all', 'Cash', 'UPI', 'Bank Transfer', 'Credit'] as PaymentMethodFilter[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMethodFilter(mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                paymentMethodFilter === mode
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* GOPAL AI SMART ANALYTICS QUESTION ASSISTANT */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 p-5 rounded-3xl border border-amber-500/30 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <span>GopalAI Smart Analytics & Query Assistant</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Ask any operational question to get instant data-backed answers.</p>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Which business had the highest sales?',
            'How much was spent this month?',
            'Which items need restocking?',
            'How many employees are required?',
            'How many catering orders are upcoming?',
            'Which payments are pending?'
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleAskGopalAI(prompt)}
              className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-amber-500/20 transition active:scale-95 text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aiQuestion.trim() && handleAskGopalAI(aiQuestion)}
            placeholder="Type your question (e.g. 'How much cash sales today?')..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={() => aiQuestion.trim() && handleAskGopalAI(aiQuestion)}
            disabled={isAiLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {isAiLoading ? 'Analyzing...' : 'Ask AI'}
          </button>
        </div>

        {/* AI Answer Display Card */}
        {aiAnswer && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/40 space-y-2 animate-fadeIn">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Query: "{aiAnswer.query}"</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pl-1">
              {aiAnswer.answer}
            </p>
            {aiAnswer.insights.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-bold text-amber-500">Key Data Insights:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {aiAnswer.insights.map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOP METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{totalSalesAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{filteredSales.length} Transactions Recorded</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Operating Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            ₹{totalExpensesAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{filteredExpenses.length} Expense Records</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Pending Receivables</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            ₹{pendingReceivablesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pending Customer Payments</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Pending Payables</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            ₹{pendingPayablesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pending Supplier Outstanding</div>
        </div>
      </div>

      {/* CHART 1: Sales Revenue Trend */}
      <div ref={salesChartRef} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Sales Revenue Trends (Daily / Periodical)</span>
          </h3>
          <button
            onClick={() => handleDownloadChartPNG(salesChartRef, 'Sales_Revenue_Trend')}
            className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition"
          >
            <ImageIcon className="w-3 h-3" /> PNG
          </button>
        </div>

        {salesTrendData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No sales records exist in database for selected filter criteria.
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Sales" stroke="#eab308" fill="#eab308" fillOpacity={0.25} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CHART 2 & 3 GRID: Income vs Expenses & Payment Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHART 2: Income vs Expenses Comparison */}
        <div ref={incomeExpenseChartRef} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              <span>Sales Revenue vs Expenses</span>
            </h3>
            <button
              onClick={() => handleDownloadChartPNG(incomeExpenseChartRef, 'Income_Vs_Expenses')}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <ImageIcon className="w-3 h-3" /> PNG
            </button>
          </div>

          {incomeExpenseData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No financial entries found.
            </div>
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="SalesIncome" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales Income" />
                  <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 3: Cash, UPI, Bank Transfer Mode Breakdown */}
        <div ref={paymentMethodChartRef} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-500" />
              <span>Payment Mode Breakdown (Cash/UPI/Bank)</span>
            </h3>
            <button
              onClick={() => handleDownloadChartPNG(paymentMethodChartRef, 'Payment_Mode_Breakdown')}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <ImageIcon className="w-3 h-3" /> PNG
            </button>
          </div>

          {paymentMethodData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No sales mode entries exist.
            </div>
          ) : (
            <div className="h-56 w-full pt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MODE_COLORS[index % MODE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* CHART 4 & 5 GRID: Inventory & Staffing Gap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHART 4: Inventory Low-Stock Alerts */}
        <div ref={stockChartRef} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-500" />
              <span>Inventory Stock & Reorder Levels</span>
            </h3>
            <button
              onClick={() => handleDownloadChartPNG(stockChartRef, 'Inventory_Stock_Levels')}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <ImageIcon className="w-3 h-3" /> PNG
            </button>
          </div>

          {stockOverviewData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No inventory items added yet.
            </div>
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockOverviewData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="CurrentStock" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Current Stock" />
                  <Bar dataKey="MinRequired" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Min Required" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 5: Manpower Staffing Gap (Required vs Assigned) */}
        <div ref={staffGapChartRef} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span>Location Staffing Gap (Required vs Assigned)</span>
            </h3>
            <button
              onClick={() => handleDownloadChartPNG(staffGapChartRef, 'Staffing_Gap')}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <ImageIcon className="w-3 h-3" /> PNG
            </button>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manpowerGapData}>
                <XAxis dataKey="location" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Required" fill="#eab308" radius={[4, 4, 0, 0]} name="Required Staff" />
                <Bar dataKey="Assigned" fill="#10b981" radius={[4, 4, 0, 0]} name="Assigned Staff" />
                <Bar dataKey="Shortage" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Shortage Gap" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 6: Gopal Caterers Booking & Revenue Trend */}
      {(selectedWorkspace === 'combined' || selectedWorkspace === 'gopal-caterers') && (
        <div ref={cateringChartRef} className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-slate-100 to-white dark:via-slate-900 dark:to-slate-900 border border-purple-500/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-purple-500" />
              <span>Gopal Caterers Outside Bookings & Revenue Trend</span>
            </h3>
            <button
              onClick={() => handleDownloadChartPNG(cateringChartRef, 'Gopal_Caterers_Trends')}
              className="text-[10px] font-bold text-purple-600 dark:text-purple-300 hover:text-purple-800 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition"
            >
              <ImageIcon className="w-3 h-3" /> PNG
            </button>
          </div>

          {cateringTrendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-purple-500/30 rounded-2xl">
              No Gopal Caterers bookings found in database for selected filter.
            </div>
          ) : (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cateringTrendData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#8b5cf6', color: '#f8fafc', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="Revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Order Revenue (INR)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* RECENT TRANSACTIONS SUMMARY TABLE */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Database Sales Records Summary ({filteredSales.length})</span>
          </h3>
          <span className="text-xs text-slate-500 font-bold">Actual Records</span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No sales transactions found in database matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-2.5 pl-2">Date</th>
                  <th className="pb-2.5">Business</th>
                  <th className="pb-2.5">Item / Product</th>
                  <th className="pb-2.5">Payment Mode</th>
                  <th className="pb-2.5 pr-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredSales.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 pl-2 text-slate-500 dark:text-slate-400">{s.date}</td>
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {BUSINESSES[s.businessId]?.name || s.businessId}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {s.items?.[0]?.itemName || 'General Sale'}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                        {s.paymentMethod || 'cash'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-right font-black text-emerald-600 dark:text-emerald-400">
                      ₹{s.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
