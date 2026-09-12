"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle2,
  Copy,
  Building2,
  User,
  Settings,
  Star,
  RefreshCw,
} from "lucide-react";
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
import {
  ManagePaymentQrModal,
  PaymentQrItem,
} from "./manage-payment-qr-modal";

interface PaymentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueAmount?: number;
  roomNumber?: string;
  guestName?: string;
}

const DEFAULT_QR_FALLBACK: PaymentQrItem = {
  id: "default-nabil-qr",
  bankName: "Nabil Bank",
  accountName: "SUJAN G.C.",
  accountNumber: "27710017501941",
  qrImageUrl: "/images/nabil-qr.jpg",
  isDefault: true,
  isActive: true,
  notes: "Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function PaymentQrModal({
  open,
  onOpenChange,
  dueAmount,
  roomNumber,
  guestName,
}: PaymentQrModalProps) {
  const [qrs, setQrs] = useState<PaymentQrItem[]>([DEFAULT_QR_FALLBACK]);
  const [selectedQrId, setSelectedQrId] = useState<string>("default-nabil-qr");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Manage Modal State
  const [manageModalOpen, setManageModalOpen] = useState(false);

  const fetchQrs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payment-qr");
      if (res.ok) {
        const data = await res.json();
        const list = data.qrs && data.qrs.length > 0 ? data.qrs : [DEFAULT_QR_FALLBACK];
        setQrs(list);

        // Auto select default QR
        const defaultItem = list.find((q: PaymentQrItem) => q.isDefault) || list[0];
        setSelectedQrId(defaultItem.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQrs();
      // Fetch user role to show/hide management button
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUserRole(data.user.role);
        })
        .catch(() => {});
    }
  }, [open]);

  const activeQr = qrs.find((q) => q.id === selectedQrId) || qrs[0] || DEFAULT_QR_FALLBACK;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(activeQr.accountNumber);
    toast.success(`Account number ${activeQr.accountNumber} copied!`);
  };

  const canManage = userRole === "OWNER" || userRole === "MANAGER";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm sm:max-w-md p-5 sm:p-6 text-center">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 opacity-0" />
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setManageModalOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Manage Payment QR & Bank Details"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              ) : (
                <div className="w-8 h-8 opacity-0" />
              )}
            </div>

            <DialogTitle className="text-xl font-bold text-center">
              Scan to Pay via QR
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {roomNumber ? `Room ${roomNumber}` : "NEW HOTEL SURYA Settlement"}
              {guestName ? ` • Guest: ${guestName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Multiple Bank Account Selector Tabs */}
          {qrs.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {qrs.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => setSelectedQrId(qr.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 ${
                    selectedQrId === qr.id
                      ? "bg-emerald-600 text-white shadow-sm font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {qr.isDefault && <Star className="w-2.5 h-2.5 fill-current" />}
                  <span>{qr.bankName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Due Amount Highlight Banner */}
          {typeof dueAmount === "number" && dueAmount > 0 && (
            <div className="my-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
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
              src={activeQr.qrImageUrl}
              alt={`${activeQr.bankName} QR Code`}
              className="w-full max-w-[250px] h-auto max-h-[250px] object-contain rounded-xl"
            />
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>{activeQr.bankName}</span>
              {activeQr.isDefault && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/40">
                  Primary
                </Badge>
              )}
            </div>
          </div>

          {/* Bank & Account Details Card */}
          <div className="text-left bg-muted/40 p-3 rounded-xl border space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Account Name:
              </span>
              <span className="font-bold text-foreground">{activeQr.accountName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Bank / Wallet:
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {activeQr.bankName}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-muted-foreground">Account Number:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                <span>{activeQr.accountNumber}</span>
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
            {activeQr.notes ||
              "Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps."}
          </p>

          <div className="flex items-center justify-between gap-2 pt-2">
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManageModalOpen(true)}
                className="gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Update QR / Bank Details</span>
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner Management Modal */}
      {canManage && (
        <ManagePaymentQrModal
          open={manageModalOpen}
          onOpenChange={setManageModalOpen}
          onUpdated={fetchQrs}
        />
      )}
    </>
  );
}
