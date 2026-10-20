export type Role = "OWNER" | "MANAGER" | "RECEPTIONIST";

export type RoomType = "AC" | "NON_AC";

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type StayStatus = "ACTIVE" | "CHECKED_OUT" | "CANCELLED";

export type BillItemCategory = "ROOM" | "FOOD" | "DRINK" | "SERVICE" | "OTHER";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT" | "CARD" | "OTHER";

export type ExpenseCategory =
  | "SALARY"
  | "FOOD_PURCHASE"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "GAS"
  | "MAINTENANCE"
  | "CLEANING"
  | "SUPPLIES"
  | "TRANSPORTATION"
  | "RENT"
  | "REPAIRS"
  | "MARKETING"
  | "OTHER";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RoomDTO {
  id: string;
  roomNumber: string;
  type: RoomType;
  status: RoomStatus;
  notes?: string | null;
  currentStay?: {
    id: string;
    customer: {
      id: string;
      fullName: string;
      contactNumber: string;
    };
    numberOfPeople: number;
    checkInAt: string;
    expectedCheckoutDate: string;
    roomPrice: number;
    balance: number;
  } | null;
}

export interface CustomerDTO {
  id: string;
  fullName: string;
  gender: Gender;
  citizenshipNumber?: string | null;
  citizenshipPhotoUrl?: string | null;
  contactNumber: string;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  staysCount?: number;
}

export interface AccompanyingGuestDTO {
  id: string;
  fullName: string;
  gender: Gender;
}

export interface BillItemDTO {
  id: string;
  stayId: string;
  category: BillItemCategory;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface PaymentDTO {
  id: string;
  stayId: string;
  amount: number;
  method: PaymentMethod;
  timestamp: string;
  notes?: string | null;
  recordedById?: string | null;
  recordedByName?: string | null;
  createdAt: string;
}

export interface StayDTO {
  id: string;
  customerId: string;
  customer: CustomerDTO;
  roomId: string;
  room: {
    id: string;
    roomNumber: string;
    type: RoomType;
    status: RoomStatus;
  };
  numberOfPeople: number;
  accompanyingGuests: AccompanyingGuestDTO[];
  expectedCheckoutDate: string;
  checkInAt: string;
  checkoutAt?: string | null;
  roomPrice: number;
  status: StayStatus;
  notes?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  billItems: BillItemDTO[];
  payments: PaymentDTO[];
  billCalculation?: {
    roomCharge: number;
    foodTotal: number;
    drinkTotal: number;
    serviceTotal: number;
    otherTotal: number;
    itemsTotal: number;
    totalAmount: number;
    paidAmount: number;
    outstandingBalance: number;
  };
}

export interface ExpenseDTO {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  receiptUrl?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId?: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  timestamp: string;
}

export type DiningTableType = "CABIN" | "HALL";
export type DiningTableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";
export type DiningOrderStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface DiningOrderItemDTO {
  id: string;
  orderId: string;
  category: BillItemCategory;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  createdAt: string;
}

export interface DiningOrderDTO {
  id: string;
  tableId: string;
  table?: DiningTableDTO;
  customerName?: string | null;
  customerPhone?: string | null;
  guestCount: number;
  status: DiningOrderStatus;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
  createdById?: string | null;
  settledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: DiningOrderItemDTO[];
}

export interface DiningTableDTO {
  id: string;
  name: string;
  type: DiningTableType;
  capacity: number;
  status: DiningTableStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  activeOrder?: DiningOrderDTO | null;
}

export interface PaymentQrDTO {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
  isDefault: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItemDTO {
  id: string;
  name: string;
  category: BillItemCategory;
  categoryName?: string | null;
  defaultPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuCategoryDTO {
  id: string;
  name: string;
  icon?: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreditAccountStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
export type CreditBillStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type CreditLedgerType = "CHARGE" | "PAYMENT" | "ADJUSTMENT" | "REFUND";

export interface CreditAccountDTO {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    fullName: string;
    contactNumber: string;
    citizenshipNumber?: string | null;
    address?: string | null;
  };
  status: CreditAccountStatus;
  creditLimit?: number | null;
  totalCharged: number;
  totalPaid: number;
  currentBalance: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  pendingBillsCount?: number;
  lastPaymentDate?: string | null;
  bills?: CreditBillDTO[];
  payments?: CreditPaymentDTO[];
  ledgerEntries?: CreditLedgerEntryDTO[];
}

export interface CreditBillItemDTO {
  id: string;
  billId: string;
  serviceItemId?: string | null;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  originalPrice?: number | null;
  isCustom: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreditBillDTO {
  id: string;
  billNumber: string;
  accountId: string;
  customerId: string;
  customer?: {
    id: string;
    fullName: string;
    contactNumber: string;
  };
  status: CreditBillStatus;
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount?: number;
  dueDate?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  items?: CreditBillItemDTO[];
  payments?: CreditPaymentDTO[];
  adjustments?: CreditAdjustmentDTO[];
}

export interface CreditPaymentDTO {
  id: string;
  receiptNumber: string;
  accountId: string;
  billId?: string | null;
  bill?: {
    id: string;
    billNumber: string;
  } | null;
  customer?: {
    id: string;
    fullName: string;
  } | null;
  amount: number;
  paymentMethod: PaymentMethod;
  previousBalance: number;
  remainingBalance: number;
  notes?: string | null;
  referenceNumber?: string | null;
  recordedById?: string | null;
  recordedBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CreditLedgerEntryDTO {
  id: string;
  accountId: string;
  type: CreditLedgerType;
  amount: number;
  debit: number;
  credit: number;
  runningBalance: number;
  description: string;
  referenceId?: string | null;
  referenceNumber?: string | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CreditAdjustmentDTO {
  id: string;
  accountId: string;
  billId?: string | null;
  amount: number;
  reason: string;
  oldTotal: number;
  newTotal: number;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CreditDashboardMetricsDTO {
  totalOutstandingCredit: number;
  totalCreditCharges: number;
  totalPaymentsCollected: number;
  totalAccountsCount: number;
  pendingPurchasesCount: number;
  partiallyPaidPurchasesCount: number;
  fullyPaidPurchasesCount: number;
  paymentsCollectedToday: number;
  paymentsCollectedThisMonth: number;
  recentPurchases: CreditBillDTO[];
  recentPayments: CreditPaymentDTO[];
  topDebtors: {
    id: string;
    customerId: string;
    customerName: string;
    contactNumber: string;
    currentBalance: number;
    pendingBillsCount: number;
    lastPaymentDate?: string | null;
  }[];
  recentAdjustments?: CreditAdjustmentDTO[];
}

export interface CompanyDTO {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  totalReceived: number;
  paymentsCount: number;
  lastPaymentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: CompanyPaymentDTO[];
}

export interface CompanyPaymentDTO {
  id: string;
  receiptNumber: string;
  companyId: string;
  company?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
  } | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string | null;
  purpose?: string | null;
  notes?: string | null;
  recordedById?: string | null;
  recordedBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}


