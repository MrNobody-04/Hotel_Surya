"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Bed,
  User,
  Clock,
  ArrowLeft,
  Receipt,
  ShieldAlert,
  QrCode,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentMethod, StayDTO } from "@/types";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [stay, setStay] = useState<StayDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Settlement payment state
  const [collectPayment, setCollectPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentNotes, setPaymentNotes] = useState("Final checkout settlement");
  const [showQrModal, setShowQrModal] = useState(false);

  // Admin override state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const [completing, setCompleting] = useState(false);

  const fetchStay = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stays/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStay(data.stay);
        if (data.stay?.billCalculation?.outstandingBalance > 0) {
          setPaymentAmount(String(data.stay.billCalculation.outstandingBalance));
          setCollectPayment(true);
        } else {
          setCollectPayment(false);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stay details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStay();
  }, [id]);

  const handleCompleteCheckout = async () => {
    if (!stay) return;

    const calc = stay.billCalculation;
    const balance = calc?.outstandingBalance || 0;

    // Check if settling payment now
    let finalPayment = null;
    if (collectPayment && Number(paymentAmount) > 0) {
      finalPayment = {
        amount: Number(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes,
      };
    } else if (balance > 0 && !overrideReason.trim()) {
      toast.error(`Cannot checkout with unpaid balance of ${formatCurrency(balance)}. Settle payment first.`);
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/stays/${id}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPayment,
          adminOverrideReason: overrideReason.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      toast.success(`Room ${stay.room.roomNumber} checked out. Room is now AVAILABLE.`);
      router.push(`/stays/${id}/bill`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !stay) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Stay not found.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (stay.status === "CHECKED_OUT") {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-bold">This Stay is Already Checked Out</h2>
        <p className="text-xs text-muted-foreground">
          Checked out at: {formatNepalDateTime(stay.checkoutAt)}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href={`/stays/${stay.id}/bill`}>
            <Button variant="outline" size="sm">
              View Receipt / Bill
            </Button>
          </Link>
          <Link href="/guests">
            <Button size="sm">Current Guests</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const calc = stay.billCalculation || {
    roomCharge: stay.roomPrice,
    foodTotal: 0,
    drinkTotal: 0,
    serviceTotal: 0,
    otherTotal: 0,
    itemsTotal: 0,
    totalAmount: stay.roomPrice,
    paidAmount: 0,
    outstandingBalance: stay.roomPrice,
    isFullyPaid: false,
  };

  const remainingBalanceAfterInline =
    calc.outstandingBalance - (collectPayment ? Number(paymentAmount) || 0 : 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href={`/stays/${stay.id}/bill`}>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Bill</span>
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg border-2 border-border overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                Guest Checkout — Room {stay.room.roomNumber}
              </CardTitle>
              <CardDescription>
                Review final unified bill and finalize checkout transaction
              </CardDescription>
            </div>
            <span className="text-xl font-mono font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg">
              Room {stay.room.roomNumber}
            </span>
          </div>

          <div className="mt-4 p-3 bg-background border rounded-lg grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Guest Name:</span>
              <span className="font-bold text-foreground">{stay.customer.fullName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Phone:</span>
              <span className="font-medium text-foreground">{stay.customer.contactNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Check-In:</span>
              <span className="font-medium text-foreground">
                {formatNepalDateTime(stay.checkInAt)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Checkout Time:</span>
              <span className="font-medium text-foreground">
                Automatic Server Time (Now)
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Final Financial Breakdown */}
          <div className="p-4 bg-muted/30 border rounded-xl space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Room Charge:</span>
              <span className="font-mono">{formatCurrency(calc.roomCharge)}</span>
            </div>
            {calc.foodTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Food Charges:</span>
                <span className="font-mono">{formatCurrency(calc.foodTotal)}</span>
              </div>
            )}
            {calc.drinkTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Beverages / Drinks:</span>
                <span className="font-mono">{formatCurrency(calc.drinkTotal)}</span>
              </div>
            )}
            {calc.serviceTotal + calc.otherTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Services & Other:</span>
                <span className="font-mono">
                  {formatCurrency(calc.serviceTotal + calc.otherTotal)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t flex items-center justify-between font-bold text-base">
              <span>TOTAL BILL:</span>
              <span className="font-mono">{formatCurrency(calc.totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-600 font-bold">
              <span>ALREADY PAID:</span>
              <span className="font-mono">{formatCurrency(calc.paidAmount)}</span>
            </div>

            <div className="pt-2 border-t flex items-center justify-between text-lg font-black">
              <span>OUTSTANDING BALANCE:</span>
              <span
                className={`font-mono ${
                  calc.outstandingBalance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600"
                }`}
              >
                {formatCurrency(calc.outstandingBalance)}
              </span>
            </div>
          </div>

          {/* Outstanding Balance Settlement Section */}
          {calc.outstandingBalance > 0 && (
            <div className="p-4 border-2 border-amber-500/40 bg-amber-500/5 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Outstanding Balance Payment Required</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPaymentMethod("QR_PAYMENT");
                    setShowQrModal(true);
                  }}
                  className="text-xs h-7 gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Show Payment QR</span>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                A guest cannot be checked out with an unpaid balance. Collect the remaining amount now.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="checkoutPayAmount" className="text-xs">
                    Payment Amount to Settle (NPR)
                  </Label>
                  <Input
                    id="checkoutPayAmount"
                    type="number"
                    inputMode="numeric"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="checkoutPayMethod" className="text-xs">
                    Payment Method
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(val: any) => setPaymentMethod(val)}
                  >
                    <SelectTrigger id="checkoutPayMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="QR_PAYMENT">Fonepay / Bank QR Payment</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                      <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* QR Payment Quick Card when QR_PAYMENT is selected */}
              {paymentMethod === "QR_PAYMENT" && (
                <div className="p-3 bg-background border-2 border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        Scan via Bank QR Code
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Fonepay, Mobile Banking, eSewa & Wallets
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQrModal(true)}
                    className="text-xs h-8 gap-1.5 shrink-0 border-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Show QR</span>
                  </Button>
                </div>
              )}

              {/* Admin Override Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverride(!showOverride)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {showOverride ? "Hide Admin Override" : "Need Manager/Owner Override?"}
                </button>

                {showOverride && (
                  <div className="mt-2 p-3 bg-muted/60 rounded-lg space-y-2 text-xs">
                    <Label htmlFor="overrideReason">Reason for Force Checkout (Audited)</Label>
                    <Input
                      id="overrideReason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Approved corporate deferred billing agreement"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Room Release Notice */}
          <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Upon completing checkout, Room {stay.room.roomNumber} will automatically return to{" "}
              <strong className="text-foreground">AVAILABLE</strong> status and stay history will be archived.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t bg-muted/20 p-4">
          <Link href={`/stays/${stay.id}/bill`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>

          <Button
            onClick={handleCompleteCheckout}
            disabled={
              completing ||
              (calc.outstandingBalance > 0 &&
                remainingBalanceAfterInline > 0 &&
                !overrideReason.trim())
            }
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold px-6"
          >
            <LogOut className="w-4 h-4" />
            <span>{completing ? "Processing..." : "Complete & Finalize Checkout"}</span>
          </Button>
        </CardFooter>
      </Card>

      <PaymentQrModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        dueAmount={Number(paymentAmount) || calc.outstandingBalance}
        roomNumber={stay?.room?.roomNumber}
        guestName={stay?.customer?.fullName}
      />
    </div>
  );
}
