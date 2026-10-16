"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, Building2, Phone, Calendar, User, Receipt, CreditCard } from "lucide-react";
import { CreditPaymentDTO } from "@/types";

interface CreditReceiptModalProps {
  payment: CreditPaymentDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CreditReceiptModal({
  payment,
  isOpen,
  onClose,
}: CreditReceiptModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(payment.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl border-amber-500/20 shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold">Payment Receipt</DialogTitle>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-muted border">
              {payment.receiptNumber}
            </span>
          </div>
        </DialogHeader>

        {/* Printable Receipt Content */}
        <div ref={printAreaRef} className="p-6 space-y-5 print:p-0 print:m-0 text-sm">
          {/* Hotel Header */}
          <div className="text-center pb-4 border-b border-dashed border-border/80">
            <h2 className="text-xl font-black tracking-wider text-amber-500 uppercase">
              HOTEL SURYA
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Luxury Hospitality & Multi-Cuisine Dining
            </p>
            <p className="text-xs text-muted-foreground">
              Nepalgunj, Banke, Nepal • Tel: +977-81-520000
            </p>
            <div className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest rounded-full border border-emerald-500/20">
              Customer Credit Payment Receipt
            </div>
          </div>

          {/* Customer & Receipt Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border">
            <div>
              <span className="text-muted-foreground block">Customer:</span>
              <span className="font-bold text-foreground text-sm">
                {payment.customer?.fullName || "Valued Customer"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Receipt No:</span>
              <span className="font-mono font-bold text-foreground">
                {payment.receiptNumber}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Date & Time:</span>
              <span className="font-medium text-foreground">{formattedDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Payment Mode:</span>
              <span className="font-bold text-foreground uppercase">
                {payment.paymentMethod.replace("_", " ")}
              </span>
            </div>
            {payment.bill && (
              <div className="col-span-2 pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Applied Bill: </span>
                <span className="font-semibold text-foreground">
                  #{payment.bill.billNumber}
                </span>
              </div>
            )}
            {payment.referenceNumber && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Ref / Txn No: </span>
                <span className="font-mono text-foreground">{payment.referenceNumber}</span>
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Previous Outstanding Balance:</span>
              <span className="font-mono">Rs. {payment.previousBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-emerald-500/10 rounded-lg text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="font-bold text-base">Amount Paid Now:</span>
              <span className="font-mono font-black text-xl">
                Rs. {payment.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-foreground pt-1">
              <span>Remaining Balance:</span>
              <span
                className={`font-mono text-base ${
                  payment.remainingBalance <= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {payment.remainingBalance <= 0
                  ? "Rs. 0 (Fully Settled)"
                  : `Rs. ${payment.remainingBalance.toLocaleString()}`}
              </span>
            </div>
          </div>

          {payment.notes && (
            <div className="text-xs p-2.5 rounded-lg bg-muted/60 border italic text-muted-foreground">
              Notes: {payment.notes}
            </div>
          )}

          {/* Footer note */}
          <div className="text-center pt-3 border-t border-dashed border-border/80 text-xs text-muted-foreground">
            <p>Thank you for your valued patronage!</p>
            <p className="text-[10px] mt-1 text-muted-foreground/70">
              Computer Generated Official Receipt • Hotel Surya
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-muted/30 border-t flex items-center justify-end gap-3 print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
