import { BillItemCategory } from "@/types";

export interface BillCalculationItem {
  id?: string;
  category: BillItemCategory;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BillPaymentItem {
  id?: string;
  amount: number;
}

export interface StayBillingInput {
  roomPrice: number;
  billItems: BillCalculationItem[];
  payments: BillPaymentItem[];
}

export interface StayBillingResult {
  roomCharge: number;
  foodTotal: number;
  drinkTotal: number;
  serviceTotal: number;
  otherTotal: number;
  itemsTotal: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  isFullyPaid: boolean;
}

/**
 * Pure billing engine function.
 * Safe against JavaScript floating point precision issues.
 */
export function calculateStayBill(input: StayBillingInput): StayBillingResult {
  const round2 = (val: number): number => {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  };

  const roomCharge = round2(Number(input.roomPrice) || 0);

  let foodTotal = 0;
  let drinkTotal = 0;
  let serviceTotal = 0;
  let otherTotal = 0;

  for (const item of input.billItems || []) {
    // Each item's total is either pre-computed or quantity * unitPrice
    const itemTotal = round2(
      item.total !== undefined && item.total !== null
        ? Number(item.total)
        : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    );

    switch (item.category) {
      case "FOOD":
        foodTotal = round2(foodTotal + itemTotal);
        break;
      case "DRINK":
        drinkTotal = round2(drinkTotal + itemTotal);
        break;
      case "SERVICE":
        serviceTotal = round2(serviceTotal + itemTotal);
        break;
      case "OTHER":
      default:
        otherTotal = round2(otherTotal + itemTotal);
        break;
    }
  }

  const itemsTotal = round2(foodTotal + drinkTotal + serviceTotal + otherTotal);
  const totalAmount = round2(roomCharge + itemsTotal);

  let paidAmount = 0;
  for (const payment of input.payments || []) {
    const amount = Number(payment.amount) || 0;
    if (amount > 0) {
      paidAmount = round2(paidAmount + amount);
    }
  }

  const outstandingBalance = round2(Math.max(0, totalAmount - paidAmount));
  const isFullyPaid = outstandingBalance === 0;

  return {
    roomCharge,
    foodTotal,
    drinkTotal,
    serviceTotal,
    otherTotal,
    itemsTotal,
    totalAmount,
    paidAmount,
    outstandingBalance,
    isFullyPaid,
  };
}
