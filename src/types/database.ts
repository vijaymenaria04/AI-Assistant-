export type BusinessId = 'jain-sweets' | 'paan-bai' | 'kesarwadi' | 'gopal-caterers' | 'personal';

export interface BusinessInfo {
  id: BusinessId;
  name: string;
  type: string;
  icon: string;
  color: string;
  bgGradient: string;
}

export const BUSINESSES: Record<BusinessId, BusinessInfo> = {
  'jain-sweets': {
    id: 'jain-sweets',
    name: 'Jain Sweets',
    type: 'Sweets & Confectionery',
    icon: 'Candy',
    color: '#EAB308', // Gold
    bgGradient: 'from-amber-500/20 to-yellow-600/10'
  },
  'paan-bai': {
    id: 'paan-bai',
    name: 'Paan Bai Canteen',
    type: 'College & Event Canteen',
    icon: 'Utensils',
    color: '#10B981', // Emerald Green
    bgGradient: 'from-emerald-500/20 to-teal-600/10'
  },
  'kesarwadi': {
    id: 'kesarwadi',
    name: 'Kesarwadi Canteen',
    type: 'Restaurant & Snacks',
    icon: 'Store',
    color: '#F97316', // Orange
    bgGradient: 'from-orange-500/20 to-amber-600/10'
  },
  'gopal-caterers': {
    id: 'gopal-caterers',
    name: 'Gopal Caterers',
    type: 'Catering & Event Management',
    icon: 'ChefHat',
    color: '#8B5CF6', // Purple
    bgGradient: 'from-purple-500/20 to-indigo-600/10'
  },
  'personal': {
    id: 'personal',
    name: 'Personal Finance',
    type: 'Owner Private Account',
    icon: 'UserCheck',
    color: '#3B82F6', // Blue
    bgGradient: 'from-blue-500/20 to-indigo-600/10'
  }
};

export interface PersonalTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'upi' | 'bank' | 'card';
  notes?: string;
  createdAt: string;
}

export interface PersonalContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  businessId: BusinessId;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'upi' | 'online' | 'credit';
  customerName?: string;
  notes?: string;
  items: SaleItem[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'raw_materials'
  | 'electricity'
  | 'rent'
  | 'staff_salary'
  | 'transportation'
  | 'packaging'
  | 'maintenance'
  | 'other';

export interface Expense {
  id: string;
  businessId: BusinessId;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: 'cash' | 'upi' | 'bank' | 'credit';
  notes?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  businessId: BusinessId;
  itemName: string;
  quantity: number;
  unit: string;
  amount: number;
  supplierId?: string;
  supplierName: string;
  date: string;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'pending';
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  businessId: BusinessId;
  name: string;
  category: string;
  stockQuantity: number;
  unit: string;
  minStockLevel: number;
  expiryDate?: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  businessId: BusinessId;
  inventoryItemId?: string;
  itemName: string;
  type: 'purchase' | 'sale' | 'consumption' | 'wastage' | 'adjustment';
  quantity: number;
  unit: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId: BusinessId;
  name: string;
  contact: string;
  totalPurchases: number;
  totalPaid: number;
  totalPayable: number;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  businessId: BusinessId;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'upi' | 'bank' | 'cheque';
  notes?: string;
  status: 'completed' | 'pending_confirmation';
  createdAt: string;
}

export interface Receivable {
  id: string;
  businessId: BusinessId;
  customerName: string;
  contact?: string;
  amount: number;
  dueDate?: string;
  paidAmount: number;
  status: 'unpaid' | 'paid' | 'partial';
  createdAt: string;
}

export interface Payable {
  id: string;
  businessId: BusinessId;
  supplierName: string;
  contact?: string;
  amount: number;
  dueDate?: string;
  paidAmount: number;
  status: 'unpaid' | 'paid' | 'partial';
  createdAt: string;
}

export interface Staff {
  id: string;
  businessId: BusinessId;
  assignedLocation: BusinessId;
  name: string;
  role: string;
  phone: string;
  salaryAmount: number;
  salaryCycle: 'daily' | 'monthly';
  dateJoined: string;
  weeklyOff?: string; // e.g. 'Sunday', 'Monday'
  overtimeRate?: number; // ₹ per hour
  advanceBalance?: number; // active unpaid advance balance
  department?: string; // Kitchen, Counter, Service, Management, Cleaning
  shift?: 'Morning' | 'Evening' | 'Full Day' | 'Night';
  status?: 'active' | 'inactive';
}

export interface StaffTransfer {
  id: string;
  staffId: string;
  staffName: string;
  fromBusinessId: BusinessId;
  toBusinessId: BusinessId;
  transferDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface ManpowerPlan {
  id: string;
  businessId: BusinessId;
  department: string;
  shift: 'Morning' | 'Evening' | 'Full Day' | 'Night';
  requiredCount: number;
  notes?: string;
  updatedAt: string;
}

export type CateringOrderStatus = 'enquiry' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface CateringOrderItem {
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface CateringOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  eventType: 'wedding' | 'birthday' | 'corporate' | 'reception' | 'anniversary' | 'other';
  eventDate: string; // YYYY-MM-DD
  eventTime?: string; // HH:mm
  venue: string;
  guestCount: number;
  menuItems: CateringOrderItem[];
  totalAmount: number;
  advanceAmount: number;
  pendingAmount: number;
  transportRequired: boolean;
  transportNotes?: string;
  equipmentRequired: boolean;
  equipmentNotes?: string;
  status: CateringOrderStatus;
  // Staff requirements
  requiredCooks: number;
  requiredHelpers: number;
  requiredWaiters: number;
  requiredSupervisors: number;
  requiredCleaners: number;
  requiredDrivers: number;
  assignedStaffIds: string[]; // staff IDs assigned and approved by owner
  notes?: string;
  createdAt: string;
}

export interface CateringEvent {
  id: string;
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  location: string;
  guestCount: number;
  requiredWaiters: number;
  requiredCooks: number;
  requiredSupervisors: number;
  assignedStaffIds: string[];
  notes?: string;
  createdAt: string;
}

export interface StaffAdvance {
  id: string;
  staffId: string;
  staffName: string;
  businessId: BusinessId;
  amount: number;
  type: 'advance' | 'deduction';
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  businessId: BusinessId;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'weekly_off' | 'extra_shift';
  checkInTime?: string;
  overtimeHours?: number;
  notes?: string;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName?: string;
  businessId: BusinessId;
  amount: number; // base salary calculated
  overtimePay?: number;
  advanceDeducted: number;
  otherDeductions?: number;
  netPaid: number;
  date: string;
  period: string; // e.g., "October 2026"
  paymentMethod: 'cash' | 'upi' | 'bank';
  status: 'paid' | 'pending';
  notes?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  businessId?: BusinessId;
  category?: 'personal' | 'supplier_payment' | 'stock_alert' | 'staff_task' | 'routine';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  dateTime: string;
  businessId?: BusinessId;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'triggered' | 'dismissed';
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isVoiceNote: boolean;
  audioDataUrl?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'payment_due' | 'reminder' | 'system' | 'sync';
  date: string;
  read: boolean;
}

export interface ReportRecord {
  id: string;
  title: string;
  type: 'sales' | 'expenses' | 'purchases' | 'combined' | 'personal';
  startDate: string;
  endDate: string;
  businessId?: BusinessId;
  summaryText: string;
  createdAt: string;
}

export interface AICommandHistory {
  id: string;
  rawCommand: string;
  action: string;
  status: 'executed' | 'cancelled' | 'failed';
  speechResponse: string;
  timestamp: string;
}

export interface BackgroundJob {
  id: string;
  taskName: string;
  schedule: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'idle' | 'failed';
}

export interface SyncQueueItem {
  id: string;
  actionType: string;
  payloadJson: string;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'synced' | 'failed';
}

export interface AppSettings {
  theme: 'dark' | 'light';
  language: 'hinglish' | 'hindi' | 'english';
  pinEnabled: boolean;
  pinHash: string; // 4-digit PIN default '1234'
  biometricEnabled?: boolean;
  voiceGender: 'female' | 'male';
  voiceSpeed: number;
  ttsEnabled: boolean;
  continuousVoiceEnabled?: boolean;
  notificationsEnabled?: boolean;
  stockAlertsEnabled?: boolean;
  paymentAlertsEnabled?: boolean;
  cloudSyncEnabled: boolean;
  backgroundTasksEnabled: boolean;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
}
