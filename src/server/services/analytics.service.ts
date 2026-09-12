import prisma from "@/lib/db";
import { calculateStayBill } from "./billing.service";

export async function getDashboardMetrics() {
  const now = new Date();

  // Create start of day in local Nepal timezone representation
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Start of current week (last 7 days)
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Start of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  // Run all independent queries in parallel for high speed
  const [
    rooms,
    todayCheckIns,
    todayCheckOuts,
    activeStays,
    todayPayments,
    weekPayments,
    monthPayments,
    todayDining,
    weekDining,
    monthDining,
    todayExp,
    monthExp,
  ] = await Promise.all([
    prisma.room.findMany(),
    prisma.stay.count({
      where: {
        checkInAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.stay.count({
      where: {
        checkoutAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.stay.findMany({
      where: { status: "ACTIVE" },
      include: {
        customer: true,
        room: true,
        billItems: true,
        payments: true,
      },
      orderBy: { checkInAt: "desc" },
    }),
    prisma.payment.aggregate({
      where: { timestamp: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { timestamp: { gte: startOfWeek } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { timestamp: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.diningOrder.aggregate({
      where: {
        status: "COMPLETED",
        OR: [
          { settledAt: { gte: startOfToday, lte: endOfToday } },
          { settledAt: null, createdAt: { gte: startOfToday, lte: endOfToday } },
        ],
      },
      _sum: { paidAmount: true },
    }),
    prisma.diningOrder.aggregate({
      where: {
        status: "COMPLETED",
        OR: [
          { settledAt: { gte: startOfWeek } },
          { settledAt: null, createdAt: { gte: startOfWeek } },
        ],
      },
      _sum: { paidAmount: true },
    }),
    prisma.diningOrder.aggregate({
      where: {
        status: "COMPLETED",
        OR: [
          { settledAt: { gte: startOfMonth } },
          { settledAt: null, createdAt: { gte: startOfMonth } },
        ],
      },
      _sum: { paidAmount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  // 1. Room Overview
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((r) => r.status === "OCCUPIED").length;
  const reservedRooms = rooms.filter((r) => r.status === "RESERVED").length;
  const maintenanceRooms = rooms.filter((r) => r.status === "MAINTENANCE").length;

  // 2. Today's Operations
  const currentGuestsHeadcount = activeStays.reduce(
    (sum, stay) => sum + (stay.numberOfPeople || 1),
    0
  );

  // 3. Current Guests details & Outstanding balances
  let totalOutstandingBalance = 0;
  const currentGuestsList = activeStays.map((stay) => {
    const bill = calculateStayBill({
      roomPrice: stay.roomPrice,
      billItems: stay.billItems as any,
      payments: stay.payments,
    });
    totalOutstandingBalance += bill.outstandingBalance;

    return {
      stayId: stay.id,
      guestName: stay.customer.fullName,
      contactNumber: stay.customer.contactNumber,
      roomNumber: stay.room.roomNumber,
      roomType: stay.room.type,
      numberOfPeople: stay.numberOfPeople,
      checkInAt: stay.checkInAt.toISOString(),
      expectedCheckoutDate: stay.expectedCheckoutDate.toISOString(),
      currentBill: bill.totalAmount,
      paid: bill.paidAmount,
      balance: bill.outstandingBalance,
    };
  });

  // 4. Financial: Revenue (Hotel Room stays + Restaurant & Cabin Orders)
  const todayHotelRevenue = todayPayments._sum.amount || 0;
  const todayRestaurantRevenue = todayDining._sum.paidAmount || 0;
  const todayRevenue = todayHotelRevenue + todayRestaurantRevenue;

  const weeklyHotelRevenue = weekPayments._sum.amount || 0;
  const weeklyRestaurantRevenue = weekDining._sum.paidAmount || 0;
  const weeklyRevenue = weeklyHotelRevenue + weeklyRestaurantRevenue;

  const monthlyHotelRevenue = monthPayments._sum.amount || 0;
  const monthlyRestaurantRevenue = monthDining._sum.paidAmount || 0;
  const monthlyRevenue = monthlyHotelRevenue + monthlyRestaurantRevenue;

  // 5. Financial: Expenses
  const todayExpenses = todayExp._sum.amount || 0;
  const monthlyExpenses = monthExp._sum.amount || 0;

  // Net Operational Result for month
  const monthlyNetIncome = monthlyRevenue - monthlyExpenses;

  // Occupancy rate right now: (occupied / total) * 100
  const currentOccupancyRate =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return {
    roomOverview: {
      total: totalRooms,
      available: availableRooms,
      occupied: occupiedRooms,
      reserved: reservedRooms,
      maintenance: maintenanceRooms,
      occupancyRate: currentOccupancyRate,
    },
    todayOperations: {
      checkIns: todayCheckIns,
      checkOuts: todayCheckOuts,
      currentGuestsHeadcount,
      activeStaysCount: activeStays.length,
    },
    financialOverview: {
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      todayHotelRevenue,
      todayRestaurantRevenue,
      weeklyHotelRevenue,
      weeklyRestaurantRevenue,
      monthlyHotelRevenue,
      monthlyRestaurantRevenue,
      todayExpenses,
      monthlyExpenses,
      monthlyNetIncome,
      outstandingPayments: totalOutstandingBalance,
    },
    currentGuests: currentGuestsList,
  };
}

export async function getDetailedAnalytics(startDate?: Date, endDate?: Date) {
  const whereDate: any = {};
  if (startDate) whereDate.gte = startDate;
  if (endDate) whereDate.lte = endDate;

  // 1. Bill items from hotel stays in period
  const billItems = await prisma.billItem.findMany({
    where: startDate || endDate ? { createdAt: whereDate } : undefined,
  });

  // 2. Completed dining orders (Cabins & Halls) in period
  const diningOrders = await prisma.diningOrder.findMany({
    where: {
      status: "COMPLETED",
      ...(startDate || endDate
        ? {
            OR: [
              { settledAt: whereDate },
              { settledAt: null, createdAt: whereDate },
            ],
          }
        : {}),
    },
    include: {
      items: true,
      table: true,
    },
  });

  const categoryTotals: Record<string, number> = {
    ROOM: 0,
    FOOD: 0,
    DRINK: 0,
    SERVICE: 0,
    OTHER: 0,
  };

  // Add bill items from room stays
  for (const item of billItems) {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.total;
  }

  // Also include room charges from stays
  const stays = await prisma.stay.findMany({
    where: startDate || endDate ? { checkInAt: whereDate } : undefined,
    include: { room: true },
  });

  for (const stay of stays) {
    categoryTotals.ROOM = (categoryTotals.ROOM || 0) + stay.roomPrice;
  }

  // Include food & drink items from completed restaurant / cabin orders
  for (const order of diningOrders) {
    for (const item of order.items) {
      const cat = item.category || "FOOD";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + item.total;
    }
  }

  // 3. Expenses in period grouped by category
  const expenses = await prisma.expense.findMany({
    where: startDate || endDate ? { date: whereDate } : undefined,
  });

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const exp of expenses) {
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    totalExpenses += exp.amount;
  }

  // 4. Payments from Hotel Stays
  const hotelPayments = await prisma.payment.findMany({
    where: startDate || endDate ? { timestamp: whereDate } : undefined,
  });

  const paymentsByMethod: Record<string, number> = {};
  let hotelRevenue = 0;
  for (const p of hotelPayments) {
    paymentsByMethod[p.method] = (paymentsByMethod[p.method] || 0) + p.amount;
    hotelRevenue += p.amount;
  }

  // 5. Payments from Restaurant & Cabins
  let restaurantRevenue = 0;
  for (const ord of diningOrders) {
    const method = ord.paymentMethod || "CASH";
    const amount = ord.paidAmount > 0 ? ord.paidAmount : ord.totalAmount;
    paymentsByMethod[method] = (paymentsByMethod[method] || 0) + amount;
    restaurantRevenue += amount;
  }

  const totalCollectedRevenue = hotelRevenue + restaurantRevenue;

  // 6. Room utilization
  const roomUsageCount: Record<string, number> = {};
  for (const stay of stays) {
    const num = stay.room.roomNumber;
    roomUsageCount[num] = (roomUsageCount[num] || 0) + 1;
  }

  // 7. Top selling items (Food & Drink from stays + dining orders)
  const itemCounts: Record<string, { name: string; category: string; count: number; revenue: number }> = {};
  for (const item of billItems) {
    if (item.category === "FOOD" || item.category === "DRINK") {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { name: item.name, category: item.category, count: 0, revenue: 0 };
      }
      itemCounts[item.name].count += item.quantity;
      itemCounts[item.name].revenue += item.total;
    }
  }

  for (const ord of diningOrders) {
    for (const item of ord.items) {
      if (item.category === "FOOD" || item.category === "DRINK") {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { name: item.name, category: item.category, count: 0, revenue: 0 };
        }
        itemCounts[item.name].count += item.quantity;
        itemCounts[item.name].revenue += item.total;
      }
    }
  }

  const topSellingItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    revenueByCategory: categoryTotals,
    totalBilledRevenue: Object.values(categoryTotals).reduce((a, b) => a + b, 0),
    totalCollectedRevenue,
    hotelRevenue,
    restaurantRevenue,
    paymentsByMethod,
    expensesByCategory,
    totalExpenses,
    netOperationalResult: totalCollectedRevenue - totalExpenses,
    roomUsageCount,
    topSellingItems,
    staysCount: stays.length,
    diningOrdersCount: diningOrders.length,
  };
}
