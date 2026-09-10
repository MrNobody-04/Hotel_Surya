import prisma from "@/lib/db";
import { RoomStatus, RoomType } from "@/types";
import { calculateStayBill } from "./billing.service";

export async function getAllRooms(filters?: { type?: RoomType; status?: RoomStatus }) {
  const where: any = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;

  const rooms = await prisma.room.findMany({
    where,
    orderBy: { roomNumber: "asc" },
    include: {
      stays: {
        where: { status: "ACTIVE" },
        include: {
          customer: true,
          billItems: true,
          payments: true,
        },
        take: 1,
      },
    },
  });

  return rooms.map((room) => {
    const activeStay = room.stays[0];
    let stayData = null;

    if (activeStay) {
      const bill = calculateStayBill({
        roomPrice: activeStay.roomPrice,
        billItems: activeStay.billItems as any,
        payments: activeStay.payments,
      });

      stayData = {
        id: activeStay.id,
        customerId: activeStay.customerId,
        customer: {
          id: activeStay.customer.id,
          fullName: activeStay.customer.fullName,
          contactNumber: activeStay.customer.contactNumber,
        },
        numberOfPeople: activeStay.numberOfPeople,
        checkInAt: activeStay.checkInAt.toISOString(),
        expectedCheckoutDate: activeStay.expectedCheckoutDate.toISOString(),
        roomPrice: activeStay.roomPrice,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        balance: bill.outstandingBalance,
      };
    }

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      status: room.status,
      notes: room.notes,
      currentStay: stayData,
    };
  });
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      stays: {
        where: { status: "ACTIVE" },
        include: {
          customer: true,
          accompanyingGuests: true,
          billItems: true,
          payments: true,
        },
        take: 1,
      },
    },
  });

  if (!room) return null;

  const activeStay = room.stays[0];
  let stayData = null;

  if (activeStay) {
    const bill = calculateStayBill({
      roomPrice: activeStay.roomPrice,
      billItems: activeStay.billItems as any,
      payments: activeStay.payments,
    });

    stayData = {
      id: activeStay.id,
      customerId: activeStay.customerId,
      customer: activeStay.customer,
      numberOfPeople: activeStay.numberOfPeople,
      accompanyingGuests: activeStay.accompanyingGuests,
      checkInAt: activeStay.checkInAt.toISOString(),
      expectedCheckoutDate: activeStay.expectedCheckoutDate.toISOString(),
      roomPrice: activeStay.roomPrice,
      bill,
    };
  }

  return {
    ...room,
    currentStay: stayData,
  };
}

export async function updateRoom(
  id: string,
  data: { roomNumber?: string; type?: RoomType; notes?: string; status?: RoomStatus }
) {
  // If attempting to change status to MAINTENANCE, check if currently occupied
  if (data.status === "MAINTENANCE") {
    const activeStay = await prisma.stay.findFirst({
      where: { roomId: id, status: "ACTIVE" },
    });
    if (activeStay) {
      throw new Error("Cannot set an occupied room into maintenance");
    }
  }

  return prisma.room.update({
    where: { id },
    data,
  });
}
