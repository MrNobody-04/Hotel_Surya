import prisma from "@/lib/db";
import { Gender } from "@/types";

export interface CreateCustomerInput {
  fullName: string;
  gender: Gender;
  citizenshipNumber?: string | null;
  citizenshipPhotoUrl?: string | null;
  contactNumber: string;
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
  return prisma.customer.create({
    data: {
      fullName: data.fullName.trim(),
      gender: data.gender,
      citizenshipNumber: data.citizenshipNumber?.trim() || null,
      citizenshipPhotoUrl: data.citizenshipPhotoUrl || null,
      contactNumber: data.contactNumber.trim(),
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function updateCustomer(id: string, data: Partial<CreateCustomerInput>) {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.fullName && { fullName: data.fullName.trim() }),
      ...(data.gender && { gender: data.gender }),
      ...(data.citizenshipNumber !== undefined && { citizenshipNumber: data.citizenshipNumber?.trim() || null }),
      ...(data.citizenshipPhotoUrl !== undefined && { citizenshipPhotoUrl: data.citizenshipPhotoUrl }),
      ...(data.contactNumber && { contactNumber: data.contactNumber.trim() }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
    },
  });
}
