"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Building2,
  User,
  Star,
  RefreshCw,
  Eye,
  ExternalLink,
  Copy,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  ManagePaymentQrModal,
  PaymentQrItem,
} from "@/components/billing/manage-payment-qr-modal";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PaymentQrPage() {
  const [qrs, setQrs] = useState<PaymentQrItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrToDelete, setQrToDelete] = useState<PaymentQrItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQrs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payment-qr?all=true");
      if (res.ok) {
        const data = await res.json();
        setQrs(data.qrs || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment QR accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrs();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleSetDefault = async (qr: PaymentQrItem) => {
    try {
      const res = await fetch(`/api/payment-qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set default QR");
      }

      toast.success(`${qr.bankName} is now the primary payment QR!`);
      fetchQrs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!qrToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/payment-qr/${qrToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete payment QR");
      }

      toast.success(`${qrToDelete.bankName} QR deleted successfully`);
      setDeleteConfirmOpen(false);
      setQrToDelete(null);
      fetchQrs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-600" />
            <span>Payment QR & Bank Accounts</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage QR codes and bank details used for customer settlements at NEW HOTEL SURYA
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setManageModalOpen(true)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Manage QR</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestModalOpen(true)}
            className="gap-1.5 h-9 border-emerald-600/30 text-emerald-700 dark:text-emerald-300"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Guest Modal</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchQrs}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="shadow-sm border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardContent className="p-4 flex items-center gap-3 text-xs">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-foreground">
              Dynamic Multi-Account QR System
            </span>
            <p className="text-muted-foreground">
              You can upload multiple bank QR codes (e.g. Nabil Bank, Global IME, eSewa). The one marked as <strong>Primary Default</strong> will always show first during checkout, billing, and restaurant settlements. Staff can also switch between accounts if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* QR Accounts Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Loading bank QR accounts...</span>
        </div>
      ) : qrs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <QrCode className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-base text-foreground mb-1">No Bank QR Codes Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Get started by adding your first payment QR code and bank account details.
          </p>
          <Button onClick={() => setManageModalOpen(true)} className="gap-1.5 bg-emerald-600 text-white">
            <Plus className="w-4 h-4" />
            <span>Add Bank QR</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrs.map((qr) => (
            <Card
              key={qr.id}
              className={`shadow-sm border-2 flex flex-col justify-between transition-all ${
                qr.isDefault
                  ? "border-emerald-500/60 bg-emerald-50/10 dark:bg-emerald-950/10"
                  : "border-border"
              }`}
            >
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>{qr.bankName}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {qr.isDefault ? (
                      <Badge variant="success" className="text-[10px] gap-1 font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Primary</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Secondary
                      </Badge>
                    )}
                    {!qr.isActive && (
                      <Badge variant="destructive" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs flex items-center gap-1 mt-1">
                  <User className="w-3 h-3" />
                  <span>Account Holder: <strong>{qr.accountName}</strong></span>
                </CardDescription>
              </CardHeader>

              <CardContent className="py-4 space-y-3 flex-1 text-xs">
                {/* QR Image */}
                <div
                  onClick={() => setPreviewImage(qr.qrImageUrl)}
                  className="mx-auto w-40 h-40 bg-white p-2 rounded-xl border-2 border-emerald-500/30 shadow-sm flex items-center justify-center cursor-pointer group relative overflow-hidden"
                  title="Click to view full image"
                >
                  <img
                    src={qr.qrImageUrl}
                    alt={qr.bankName}
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-semibold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>View Large</span>
                  </div>
                </div>

                {/* Account Number Box */}
                <div className="p-2.5 bg-muted/40 rounded-xl border flex items-center justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    <span>{qr.accountNumber}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(qr.accountNumber, "Account number")}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title="Copy Account Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {qr.notes && (
                  <p className="text-[11px] text-muted-foreground italic text-center">
                    {qr.notes}
                  </p>
                )}
              </CardContent>

              <CardFooter className="pt-2 pb-3 px-4 border-t bg-muted/10 flex items-center justify-between gap-2">
                {!qr.isDefault ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(qr)}
                    className="h-8 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    <span>Make Default</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Primary
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManageModalOpen(true)}
                    className="h-8 px-2.5 text-xs gap-1"
                    title="Edit Details / Replace QR"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setQrToDelete(qr);
                      setDeleteConfirmOpen(true);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Manage QR Modal */}
      <ManagePaymentQrModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
        onUpdated={fetchQrs}
      />

      {/* Guest/Staff View Preview Modal */}
      <PaymentQrModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        dueAmount={2500}
        roomNumber="101"
        guestName="Sample Guest"
      />

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-sm p-4 text-center">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold">QR Code Preview</DialogTitle>
          </DialogHeader>
          <div className="p-3 bg-white rounded-xl flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="Full QR Preview"
                className="w-full max-w-[280px] h-auto object-contain rounded"
              />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewImage(null)}
          >
            Close Preview
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete {qrToDelete?.bankName} QR?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete the payment QR for{" "}
              <strong>{qrToDelete?.accountName}</strong> ({qrToDelete?.bankName} - A/C: {qrToDelete?.accountNumber})?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
