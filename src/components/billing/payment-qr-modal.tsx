"use client";

import React from "react";
import Image from "next/image";
import { QrCode, CheckCircle2, Copy, Download, Building2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface PaymentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueAmount?: number;
  roomNumber?: string;
  guestName?: string;
}

export function PaymentQrModal({
  open,
  onOpenChange,
  dueAmount,
  roomNumber,
  guestName,
}: PaymentQrModalProps) {
  const accountNo = "27710017501941";
  const accountHolder = "SUJAN G.C.";
  const bankName = "Nabil Bank";

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNo);
    toast.success("Account number copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-6 text-center">
        <DialogHeader className="space-y-1">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-1">
            <QrCode className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Scan to Pay via QR
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {roomNumber ? `Room ${roomNumber}` : "Hotel Surya Settlement"}
            {guestName ? ` • Guest: ${guestName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Due Amount Highlight Banner */}
        {typeof dueAmount === "number" && dueAmount > 0 && (
          <div className="my-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Amount to Pay / Settle:
            </span>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
              {formatCurrency(dueAmount)}
            </div>
          </div>
        )}

        {/* QR Code Graphic Container */}
        <div className="my-2 p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md flex flex-col items-center">
          <img
            src="/images/nabil-qr.jpg"
            alt="Hotel Surya Nabil Bank QR Code"
            className="w-full max-w-[260px] h-auto object-contain rounded-xl"
          />
        </div>

        {/* Bank & Account Details Card */}
        <div className="text-left bg-muted/40 p-3 rounded-xl border space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Account Name:
            </span>
            <span className="font-bold text-foreground">{accountHolder}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Bank:
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {bankName}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-muted-foreground">Account Number:</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
              <span>{accountNo}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyAccount}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Copy Account Number"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
