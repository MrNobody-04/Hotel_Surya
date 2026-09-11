import prisma from "@/lib/db";
import { BillItemCategory, PaymentMethod } from "@/types";
import { logAuditEvent } from "./audit.service";

export interface DiningOrderItemInput {
  name: string;
  category?: BillItemCategory;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface StartDiningOrderInput {
  tableId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  guestCount?: number;
  notes?: string | null;
  items?: DiningOrderItemInput[];
  userId: string;
  userName: string;
}

export async function getDiningTables() {
  const tables = await prisma.diningTable.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      orders: {
        where: { status: "ACTIVE" },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return tables.map((t) => {
    const activeOrder = t.orders[0] || null;
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      status: t.status,
      capacity: t.capacity,
      notes: t.notes,
      activeOrder: activeOrder
        ? {
            id: activeOrder.id,
            customerName: activeOrder.customerName || "Walk-in Customer",
            customerPhone: activeOrder.customerPhone,
            guestCount: activeOrder.guestCount,
            totalAmount: activeOrder.totalAmount,
            paidAmount: activeOrder.paidAmount,
            createdAt: activeOrder.createdAt,
            notes: activeOrder.notes,
            items: activeOrder.items,
          }
        : null,
    };
  });
}

export async function getDiningOrderById(orderId: string) {
  return prisma.diningOrder.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function startDiningOrder(input: StartDiningOrderInput) {
  return await prisma.$transaction(async (tx) => {
    const table = await tx.diningTable.findUnique({
      where: { id: input.tableId },
    });

    if (!table) {
      throw new Error("Dining table not found");
    }

    // Check if table currently has an active order
    const existingOrder = await tx.diningOrder.findFirst({
      where: { tableId: input.tableId, status: "ACTIVE" },
    });

    if (existingOrder) {
      throw new Error(
        `Table ${table.name} already has an active order (#${existingOrder.id.slice(0, 6)})`
      );
    }

    const items = input.items || [];
    let initialTotal = 0;
    for (const item of items) {
      initialTotal += Math.max(1, item.quantity) * Math.max(0, item.unitPrice);
    }

    const order = await tx.diningOrder.create({
      data: {
        tableId: input.tableId,
        customerName: input.customerName?.trim() || "Walk-in Customer",
        customerPhone: input.customerPhone?.trim() || null,
        guestCount: Math.max(1, Number(input.guestCount) || 1),
        notes: input.notes?.trim() || null,
        totalAmount: initialTotal,
        status: "ACTIVE" as any,
        createdById: input.userId,
      },
    });

    if (items.length > 0) {
      for (const item of items) {
        const q = Math.max(1, Number(item.quantity) || 1);
        const p = Math.max(0, Number(item.unitPrice) || 0);
        await tx.diningOrderItem.create({
          data: {
            orderId: order.id,
            category: (item.category || "FOOD") as any,
            name: item.name.trim(),
            quantity: q,
            unitPrice: p,
            total: q * p,
            notes: item.notes?.trim() || null,
          },
        });
      }
    }

    // Mark table as OCCUPIED
    await tx.diningTable.update({
      where: { id: input.tableId },
      data: { status: "OCCUPIED" as any },
    });

    await logAuditEvent({
      userId: input.userId,
      userName: input.userName,
      action: "DINING_ORDER_STARTED",
      entity: "DiningOrder",
      entityId: order.id,
      metadata: {
        tableName: table.name,
        customerName: input.customerName,
        itemCount: items.length,
        totalAmount: initialTotal,
      },
    });

    return tx.diningOrder.findUnique({
      where: { id: order.id },
      include: { table: true, items: true },
    });
  });
}

export async function addItemsToDiningOrder(
  orderId: string,
  items: DiningOrderItemInput[],
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.diningOrder.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      throw new Error("Dining order not found");
    }

    if (order.status !== "ACTIVE") {
      throw new Error(`Cannot add items to a ${order.status.toLowerCase()} order`);
    }

    for (const item of items) {
      const q = Math.max(1, Number(item.quantity) || 1);
      const p = Math.max(0, Number(item.unitPrice) || 0);
      await tx.diningOrderItem.create({
        data: {
          orderId,
          category: (item.category || "FOOD") as any,
          name: item.name.trim(),
          quantity: q,
          unitPrice: p,
          total: q * p,
          notes: item.notes?.trim() || null,
        },
      });
    }

    // Recalculate order total
    const allItems = await tx.diningOrderItem.findMany({
      where: { orderId },
    });
    const newTotal = allItems.reduce((sum, it) => sum + it.total, 0);

    const updated = await tx.diningOrder.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
      include: { table: true, items: true },
    });

    await logAuditEvent({
      userId,
      userName,
      action: "DINING_ORDER_ITEMS_ADDED",
      entity: "DiningOrder",
      entityId: orderId,
      metadata: {
        tableName: order.table.name,
        newItemsCount: items.length,
        newTotal,
      },
    });

    return updated;
  });
}

export async function removeDiningOrderItem(
  orderId: string,
  itemId: string,
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const item = await tx.diningOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.orderId !== orderId) {
      throw new Error("Order item not found");
    }

    await tx.diningOrderItem.delete({
      where: { id: itemId },
    });

    // Recalculate
    const remaining = await tx.diningOrderItem.findMany({
      where: { orderId },
    });
    const newTotal = remaining.reduce((sum, it) => sum + it.total, 0);

    const updated = await tx.diningOrder.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
      include: { table: true, items: true },
    });

    return updated;
  });
}

export async function settleDiningOrder(
  orderId: string,
  payment: {
    amount: number;
    method: PaymentMethod;
    notes?: string | null;
  },
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.diningOrder.findUnique({
      where: { id: orderId },
      include: { table: true, items: true },
    });

    if (!order) {
      throw new Error("Dining order not found");
    }

    if (order.status !== "ACTIVE") {
      throw new Error(`Order is already ${order.status.toLowerCase()}`);
    }

    const settled = await tx.diningOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED" as any,
        paidAmount: Number(payment.amount),
        paymentMethod: (payment.method as any) || null,
        notes: payment.notes?.trim() || order.notes,
        settledAt: new Date(),
      },
      include: { table: true, items: true },
    });

    // Reset table back to AVAILABLE if no other active order exists
    const otherActive = await tx.diningOrder.findFirst({
      where: { tableId: order.tableId, status: "ACTIVE" },
    });

    if (!otherActive) {
      await tx.diningTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" as any },
      });
    }

    await logAuditEvent({
      userId,
      userName,
      action: "DINING_ORDER_SETTLED",
      entity: "DiningOrder",
      entityId: orderId,
      metadata: {
        tableName: order.table.name,
        amountPaid: payment.amount,
        method: payment.method,
      },
    });

    return settled;
  });
}

export async function cancelDiningOrder(
  orderId: string,
  reason: string,
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.diningOrder.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      throw new Error("Dining order not found");
    }

    const updated = await tx.diningOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED" as any,
        notes: reason ? `Cancelled: ${reason}` : order.notes,
      },
    });

    // Reset table to AVAILABLE
    const otherActive = await tx.diningOrder.findFirst({
      where: { tableId: order.tableId, status: "ACTIVE" },
    });

    if (!otherActive) {
      await tx.diningTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" as any },
      });
    }

    await logAuditEvent({
      userId,
      userName,
      action: "DINING_ORDER_CANCELLED",
      entity: "DiningOrder",
      entityId: orderId,
      metadata: {
        tableName: order.table.name,
        reason,
      },
    });

    return updated;
  });
}

export async function deleteDiningOrder(
  orderId: string,
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.diningOrder.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      throw new Error("Dining order not found");
    }

    const tableId = order.tableId;
    const wasActive = order.status === "ACTIVE";

    await tx.diningOrderItem.deleteMany({ where: { orderId } });
    await tx.diningOrder.delete({ where: { id: orderId } });

    if (wasActive) {
      const remainingActive = await tx.diningOrder.findFirst({
        where: { tableId, status: "ACTIVE" },
      });
      if (!remainingActive) {
        await tx.diningTable.update({
          where: { id: tableId },
          data: { status: "AVAILABLE" as any },
        });
      }
    }

    await logAuditEvent({
      userId,
      userName,
      action: "DINING_ORDER_DELETED",
      entity: "DiningOrder",
      entityId: orderId,
      metadata: {
        tableName: order.table.name,
      },
    });

    return { success: true, id: orderId };
  });
}

export async function getDiningOrderHistory(limit = 50, skip = 0) {
  const [orders, total] = await Promise.all([
    prisma.diningOrder.findMany({
      where: { status: { in: ["COMPLETED", "CANCELLED"] as any } },
      orderBy: { settledAt: "desc" },
      take: limit,
      skip,
      include: {
        table: true,
        items: true,
      },
    }),
    prisma.diningOrder.count({
      where: { status: { in: ["COMPLETED", "CANCELLED"] as any } },
    }),
  ]);

  return { orders, total };
}
