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
