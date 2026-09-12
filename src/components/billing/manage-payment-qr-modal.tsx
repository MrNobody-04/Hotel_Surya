"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Upload,
  Building2,
  User,
  Star,
  RefreshCw,
  AlertTriangle,
  X,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface PaymentQrItem {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
  isDefault: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ManagePaymentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

/**
 * Utility to compress an image client-side to a base64 Data URL
 */
function compressImageFile(file: File, maxWidth = 600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function ManagePaymentQrModal({
  open,
  onOpenChange,
  onUpdated,
}: ManagePaymentQrModalProps) {
  const [qrs, setQrs] = useState<PaymentQrItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form View State: "list" | "add" | "edit"
  const [viewMode, setViewMode] = useState<"list" | "add" | "edit">("list");
  const [selectedQr, setSelectedQr] = useState<PaymentQrItem | null>(null);

  // Form Inputs
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  // Delete Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrToDelete, setQrToDelete] = useState<PaymentQrItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.error("Failed to load payment QR configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQrs();
      setViewMode("list");
    }
  }, [open]);

  const handleOpenAdd = () => {
    setSelectedQr(null);
    setBankName("");
    setAccountName("SUJAN G.C.");
    setAccountNumber("");
    setQrImageUrl("");
    setNotes("Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps.");
    setIsDefault(qrs.length === 0);
    setIsActive(true);
    setViewMode("add");
  };

  const handleOpenEdit = (qr: PaymentQrItem) => {
    setSelectedQr(qr);
    setBankName(qr.bankName);
    setAccountName(qr.accountName);
    setAccountNumber(qr.accountNumber);
    setQrImageUrl(qr.qrImageUrl);
    setNotes(qr.notes || "");
    setIsDefault(qr.isDefault);
    setIsActive(qr.isActive);
    setViewMode("edit");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (PNG, JPG, WEBP)");
      return;
    }

    try {
      setProcessingImage(true);
      const compressedDataUrl = await compressImageFile(file, 600, 0.85);
      setQrImageUrl(compressedDataUrl);
      toast.success("QR Code image attached and optimized!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to process QR image");
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      toast.error("Please enter a bank or service name");
      return;
    }
    if (!accountName.trim()) {
      toast.error("Please enter the account holder name");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Please enter the account number");
      return;
    }
    if (!qrImageUrl.trim()) {
      toast.error("Please upload or choose a QR code image");
      return;
    }

    setSaving(true);
    try {
      if (viewMode === "add") {
        const res = await fetch("/api/payment-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            qrImageUrl: qrImageUrl.trim(),
            isDefault,
            isActive,
            notes: notes.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create payment QR");

        toast.success(`${bankName} QR added successfully!`);
      } else if (viewMode === "edit" && selectedQr) {
        const res = await fetch(`/api/payment-qr/${selectedQr.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            qrImageUrl: qrImageUrl.trim(),
            isDefault,
            isActive,
            notes: notes.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update payment QR");

        toast.success(`${bankName} QR updated successfully!`);
      }

      await fetchQrs();
      setViewMode("list");
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
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
      await fetchQrs();
      onUpdated?.();
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
      await fetchQrs();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[98vw] max-w-2xl max-h-[92dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    Payment QR & Bank Accounts
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Configure bank account details and QR images for guest settlements
                  </DialogDescription>
                </div>
              </div>

              {viewMode === "list" && (
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New QR</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
            {/* VIEW MODE: LIST */}
            {viewMode === "list" && (
              <div className="space-y-3">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading payment QR accounts...</span>
                  </div>
                ) : qrs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-3">
                    <p>No payment QR configurations found.</p>
                    <Button size="sm" onClick={handleOpenAdd} className="gap-1">
                      <Plus className="w-4 h-4" />
                      <span>Add First QR</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {qrs.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          item.isDefault
                            ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* QR Thumbnail */}
                          <div
                            onClick={() => setPreviewImage(item.qrImageUrl)}
                            className="relative group w-14 h-14 shrink-0 rounded-lg overflow-hidden border bg-white cursor-pointer shadow-sm flex items-center justify-center"
                            title="Click to view full QR image"
                          >
                            <img
                              src={item.qrImageUrl}
                              alt={item.bankName}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Bank & Account Details */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">
                                {item.bankName}
                              </span>
                              {item.isDefault && (
                                <Badge variant="success" className="text-[10px] gap-1 font-bold">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>Primary Default</span>
                                </Badge>
                              )}
                              {!item.isActive && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{item.accountName}</span>
                            </div>
                            <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              A/C: {item.accountNumber}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {!item.isDefault && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(item)}
                              className="h-7 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Set as Default"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              <span>Make Default</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 px-2 text-xs gap-1"
                            title="Edit Details / Change QR"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQrToDelete(item);
                              setDeleteConfirmOpen(true);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Delete QR"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE: ADD or EDIT */}
            {(viewMode === "add" || viewMode === "edit") && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="font-bold text-sm text-foreground">
                    {viewMode === "add" ? "Add New Payment QR" : `Edit ${selectedQr?.bankName}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 text-xs"
                  >
                    Back to List
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="bName">Bank / Wallet Name *</Label>
                    <Input
                      id="bName"
                      placeholder="e.g. Nabil Bank, Global IME, eSewa"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="bAccName">Account Holder Name *</Label>
                    <Input
                      id="bAccName"
                      placeholder="e.g. SUJAN G.C."
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bAccNum">Account Number *</Label>
                  <Input
                    id="bAccNum"
                    placeholder="e.g. 27710017501941"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="font-mono font-bold"
                    required
                  />
                </div>

                {/* QR Image Upload & Preview Section */}
                <div className="p-3.5 bg-muted/30 border rounded-xl space-y-2.5">
                  <Label className="font-bold text-xs">Payment QR Code Graphic *</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Live Image Preview */}
                    <div className="w-28 h-28 shrink-0 bg-white border-2 border-emerald-500/40 rounded-xl p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="QR Preview"
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground text-[10px] flex flex-col items-center">
                          <QrCode className="w-6 h-6 text-muted-foreground/50 mb-1" />
                          <span>No image selected</span>
                        </div>
                      )}
                    </div>

                    {/* File Upload Controls */}
                    <div className="flex-1 space-y-2 w-full">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingImage}
                        className="w-full sm:w-auto gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-300"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {processingImage
                            ? "Optimizing Image..."
                            : qrImageUrl
                            ? "Change QR Image File"
                            : "Upload QR Image File"}
                        </span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        Select a photo or scan of your bank QR code. Images are automatically optimized and securely saved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bNotes">Notes & Instructions (Optional)</Label>
                  <Input
                    id="bNotes"
                    placeholder="e.g. Works with Fonepay, Nabil Smart, eSewa..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-xs">Set as Primary / Default QR</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-xs">Active (Available for billing)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewMode("list")}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || processingImage}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {saving
                      ? "Saving..."
                      : viewMode === "add"
                      ? "Create Payment QR"
                      : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              {qrs.length} configured account(s)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
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
              Are you sure you want to delete this payment QR for{" "}
              <strong>{qrToDelete?.accountName}</strong> (A/C: {qrToDelete?.accountNumber})?
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

      {/* FULL-SIZE QR IMAGE PREVIEW MODAL */}
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
    </>
  );
}
