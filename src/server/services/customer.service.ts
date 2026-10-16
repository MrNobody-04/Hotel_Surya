import prisma from "@/lib/db";
import { Gender } from "@/types";

export interface CreateCustomerInput {
  fullName: string;
  gender?: Gender;
  citizenshipNumber?: string | null;
  citizenshipPhotoUrl?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function searchCustomers(query?: string, take = 50, skip = 0) {
  const q = query?.trim();

  let where: any = {};
  if (q) {
    where = {
      OR: [
        { fullName: { contains: q } },
        { contactNumber: { contains: q } },
        { citizenshipNumber: { contains: q } },
      ],
    };
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: {
          select: { stays: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      staysCount: c._count.stays,
    })),
    total,
  };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      stays: {
        orderBy: { checkInAt: "desc" },
        include: {
          room: true,
          billItems: true,
          payments: true,
        },
      },
    },
  });
}

export async function createCustomer(data: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      fullName: data.fullName.trim(),
      gender: data.gender || ("PREFER_NOT_TO_SAY" as any),
      citizenshipNumber: data.citizenshipNumber?.trim() || null,
      citizenshipPhotoUrl: data.citizenshipPhotoUrl || null,
      contactNumber: data.contactNumber?.trim() || "N/A",
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  // Automatically initialize a zero-balance credit account
  try {
    await prisma.creditAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: {
        customerId: customer.id,
        status: "PAID" as any,
        currentBalance: 0,
        totalCharged: 0,
        totalPaid: 0,
      },
    });
  } catch (e) {
    // Non-fatal if already exists
  }

  return customer;
}

export async function updateCustomer(id: string, data: Partial<CreateCustomerInput>) {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.fullName && { fullName: data.fullName.trim() }),
      ...(data.gender && { gender: data.gender }),
      ...(data.citizenshipNumber !== undefined && { citizenshipNumber: data.citizenshipNumber?.trim() || null }),
      ...(data.citizenshipPhotoUrl !== undefined && { citizenshipPhotoUrl: data.citizenshipPhotoUrl }),
      ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber?.trim() || "N/A" }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
    },
  });
}

export async function deleteCustomer(id: string, userId: string, userName: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      stays: {
        select: { id: true, status: true, roomId: true },
      },
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const activeStay = customer.stays.find((s) => s.status === "ACTIVE");
  if (activeStay) {
    throw new Error(
      "Cannot delete customer who currently has an active stay in a room. Check out or cancel the stay first."
    );
  }

  return await prisma.$transaction(async (tx) => {
    // Delete any customer credit records safely
    await tx.creditAdjustment.deleteMany({ where: { account: { customerId: id } } });
    await tx.creditLedgerEntry.deleteMany({ where: { account: { customerId: id } } });
    await tx.creditPayment.deleteMany({ where: { account: { customerId: id } } });
    await tx.creditBillItem.deleteMany({ where: { bill: { customerId: id } } });
    await tx.creditBill.deleteMany({ where: { customerId: id } });
    await tx.creditAccount.deleteMany({ where: { customerId: id } });

    // Delete all historical stay records and related items for this customer
    for (const stay of customer.stays) {
      await tx.billItem.deleteMany({ where: { stayId: stay.id } });
      await tx.payment.deleteMany({ where: { stayId: stay.id } });
      await tx.accompanyingGuest.deleteMany({ where: { stayId: stay.id } });
      await tx.stay.delete({ where: { id: stay.id } });
    }

    // Delete customer
    await tx.customer.delete({
      where: { id },
    });

    return {
      success: true,
      fullName: customer.fullName,
      staysDeleted: customer.stays.length,
    };
  });
}
