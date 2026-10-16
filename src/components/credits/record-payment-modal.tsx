"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Loader2,
  Receipt,
  QrCode,
  Building,
  Banknote,
} from "lucide-react";
import { CreditAccountDTO, CreditBillDTO, CreditPaymentDTO, PaymentMethod } from "@/types";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CreditAccountDTO | null;
  targetBill?: CreditBillDTO | null;
  onPaymentSuccess: (payment: CreditPaymentDTO) => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  account,
  targetBill,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen && account) {
      setError(null);
      setReferenceNumber("");
      setNotes("");
      setPaymentMethod("CASH");

      if (targetBill) {
        setSelectedBillId(targetBill.id);
        const billDue = Math.max(0, targetBill.totalAmount - targetBill.paidAmount);
        setAmount(String(billDue));
      } else {
        setSelectedBillId("ALL");
        setAmount(String(account.currentBalance));
      }
    }
  }, [isOpen, account, targetBill]);

  if (!account) return null;

  const currentBalance = account.currentBalance;
  const numAmount = parseFloat(amount) || 0;
  const remainingBalance = Math.max(0, Math.round((currentBalance - numAmount) * 100) / 100);

  const handleQuickAmount = (val: number) => {
    const capped = Math.min(val, currentBalance);
    setAmount(String(capped));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }
    if (numAmount > currentBalance + 0.01) {
      setError(
        `Payment (Rs. ${numAmount}) cannot exceed the current outstanding balance (Rs. ${currentBalance})`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Generate a client idempotency key to prevent accidental duplicate submission
      const idempotencyKey = `PAY-${account.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch("/api/credits/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          billId: selectedBillId && selectedBillId !== "ALL" ? selectedBillId : null,
          amount: numAmount,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || null,
          notes: notes.trim() || null,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      onPaymentSuccess(data.payment);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl shadow-2xl border-amber-500/20">
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Collect Credit Payment</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record full or installment payment for {account.customer?.fullName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Balance Summary Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border">
            <div>
              <span className="text-xs text-muted-foreground block">Customer Name</span>
              <span className="font-bold text-sm text-foreground">
                {account.customer?.fullName}
              </span>
              <span className="text-xs text-muted-foreground block font-mono">
                {account.customer?.contactNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current Balance</span>
              <span className="font-mono font-black text-lg text-rose-500">
                Rs. {currentBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Target Bill (Optional) */}
          {account.bills && account.bills.filter((b) => b.status !== "PAID").length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Allocation</Label>
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bill to allocate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    General Account (Auto-apply to Oldest Bills FIFO)
                  </SelectItem>
                  {account.bills
                    .filter((b) => b.status !== "PAID")
                    .map((b) => {
                      const due = Math.max(0, b.totalAmount - b.paidAmount);
                      return (
                        <SelectItem key={b.id} value={b.id}>
                          Bill #{b.billNumber} • Due: Rs. {due.toLocaleString()} (Total: Rs.{" "}
                          {b.totalAmount.toLocaleString()})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Amount to Pay (Rs.) *</Label>
              <span className="text-xs text-muted-foreground font-mono">
                Max: Rs. {currentBalance.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                Rs.
              </span>
              <Input
                type="number"
                step="any"
                min="1"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-12 font-mono text-lg font-bold h-11"
                required
              />
            </div>

            {/* Quick Fill Preset Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5 rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                onClick={() => handleQuickAmount(currentBalance)}
              >
                Full (Rs. {currentBalance})
              </Button>
              {currentBalance > 1000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 rounded-lg"
                  onClick={() => handleQuickAmount(Math.round(currentBalance / 2))}
                >
                  50% (Rs. {Math.round(currentBalance / 2)})
                </Button>
              )}
              {currentBalance >= 1000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 rounded-lg"
                  onClick={() => handleQuickAmount(1000)}
                >
                  Rs. 1,000
                </Button>
              )}
              {currentBalance >= 500 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 rounded-lg"
                  onClick={() => handleQuickAmount(500)}
                >
                  Rs. 500
                </Button>
              )}
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val: PaymentMethod) => setPaymentMethod(val)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Payment</SelectItem>
                  <SelectItem value="QR_PAYMENT">Fonepay / QR Scan</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                  <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                  <SelectItem value="OTHER">Other Method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / Receipt # (Optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Txn ID / Bank Ref"
                className="h-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Remarks / Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Installment payment notes, handed over by, etc."
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          {/* Balance Preview Indicator */}
          <div className="p-3 bg-muted/60 rounded-xl border flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground block">Remaining Debt After Payment</span>
              <span
                className={`font-mono font-bold text-base ${
                  remainingBalance === 0 ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {remainingBalance === 0
                  ? "Rs. 0 (Fully Paid!)"
                  : `Rs. ${remainingBalance.toLocaleString()}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block">Paying Now</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                + Rs. {numAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || numAmount <= 0 || numAmount > currentBalance + 0.01}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Confirm Payment (Rs. {numAmount.toLocaleString()})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
