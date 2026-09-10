"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  Bed,
  Phone,
  Clock,
  DollarSign,
  PlusCircle,
  CreditCard,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  Utensils,
  UserPlus,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { StayDTO } from "@/types";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";

export default function CurrentGuestsPage() {
  const [stays, setStays] = useState<StayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qrModalStay, setQrModalStay] = useState<StayDTO | null>(null);

  const fetchCurrentGuests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stays?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setStays(data.stays || []);
      }
    } catch (err) {
      console.error("Failed to load guests:", err);
      toast.error("Failed to load active guests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentGuests();
  }, []);

  const filteredStays = stays.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.customer.fullName.toLowerCase().includes(q) ||
      s.room.roomNumber.toLowerCase().includes(q) ||
      s.customer.contactNumber.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Current In-House Guests
          </h1>
          <p className="text-sm text-muted-foreground">
            Active hotel stays, live unified bills, and checkout management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCurrentGuests}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/check-in">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="w-4 h-4" />
              <span>New Check-in</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone number, or room number..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          {filteredStays.length} active stay{filteredStays.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Guests Display */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredStays.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Current Guests</h3>
          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
            {search
              ? "No guests match your search criteria."
              : "There are currently no active stays at Hotel Surya. All rooms are ready for check-in."}
          </p>
          {!search && (
            <Link href="/check-in">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span>Check In Guest</span>
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Responsive Card List for Mobile, Table for Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStays.map((stay) => {
              const calc = stay.billCalculation || {
                totalAmount: stay.roomPrice,
                paidAmount: 0,
                outstandingBalance: stay.roomPrice,
              };

              return (
                <Card
                  key={stay.id}
                  className="shadow-sm border-2 border-border hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {stay.room.roomNumber}
                        </span>
                        <Badge variant={stay.room.type === "AC" ? "purple" : "secondary"}>
                          {stay.room.type}
                        </Badge>
                      </div>
                      <Badge variant="info">IN-HOUSE</Badge>
                    </div>

                    <div className="mt-2">
                      <CardTitle className="text-base font-semibold">
                        {stay.customer.fullName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-0.5 text-xs">
                        <Phone className="w-3 h-3" />
                        <span>{stay.customer.contactNumber}</span>
                        <span>•</span>
                        <span>{stay.numberOfPeople} Person(s)</span>
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Check-In:</span>
                      <span className="font-medium text-foreground">
                        {formatNepalDateTime(stay.checkInAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Expected Out:</span>
                      <span className="font-medium text-foreground">
                        {formatNepalDateTime(stay.expectedCheckoutDate)}
                      </span>
                    </div>

                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Room Charge:</span>
                        <span>{formatCurrency(stay.roomPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">F&B & Services:</span>
                        <span>
                          {formatCurrency(calc.totalAmount - stay.roomPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Live Bill:</span>
                        <span className="font-mono">{formatCurrency(calc.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600 font-medium">
                        <span>Total Paid:</span>
                        <span className="font-mono">{formatCurrency(calc.paidAmount)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between font-bold text-sm">
                      <span>Balance Due:</span>
                      <div className="flex items-center gap-1.5">
                        {calc.outstandingBalance > 0 ? (
                          <>
                            <span className="text-amber-600 dark:text-amber-400 font-mono">
                              {formatCurrency(calc.outstandingBalance)}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setQrModalStay(stay)}
                              className="h-6 px-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                              title="Scan QR to pay"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-semibold">QR</span>
                            </Button>
                          </>
                        ) : (
                          <span className="text-emerald-600 font-mono">PAID IN FULL</span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-3 px-4 border-t bg-muted/10 grid grid-cols-2 gap-2">
                    <Link href={`/stays/${stay.id}/bill`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        View / Edit Bill
                      </Button>
                    </Link>
                    <Link href={`/stays/${stay.id}/checkout`} className="w-full">
                      <Button size="sm" className="w-full text-xs h-8 bg-primary">
                        Checkout
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <PaymentQrModal
        open={!!qrModalStay}
        onOpenChange={(open) => !open && setQrModalStay(null)}
        dueAmount={qrModalStay?.billCalculation?.outstandingBalance}
        roomNumber={qrModalStay?.room?.roomNumber}
        guestName={qrModalStay?.customer?.fullName}
      />
    </div>
  );
}
