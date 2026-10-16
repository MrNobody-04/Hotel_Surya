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
import { Textarea } from "@/components/ui/textarea";
import {
  Edit3,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { CreditBillDTO, CreditBillItemDTO } from "@/types";

interface EditBillModalProps {
  bill: CreditBillDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBill: CreditBillDTO) => void;
}

interface EditableItem {
  serviceItemId?: string | null;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  isCustom?: boolean;
  notes?: string | null;
}

export function EditBillModal({
  bill,
  isOpen,
  onClose,
  onSuccess,
}: EditBillModalProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New item helper state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  useEffect(() => {
    if (isOpen && bill) {
      setError(null);
      setReason("");
      setDiscount(String(bill.discount || 0));
      setNotes(bill.notes || "");
      setShowAddCustom(false);

      if (bill.items && bill.items.length > 0) {
        setItems(
          bill.items.map((item) => ({
            serviceItemId: item.serviceItemId || null,
            name: item.name,
            category: item.category || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice || null,
            isCustom: item.isCustom,
            notes: item.notes || null,
          }))
        );
      } else {
        setItems([]);
      }
    }
  }, [isOpen, bill]);

  if (!bill) return null;

  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0 || isNaN(newPrice)) return;
    const updated = [...items];
    updated[index].unitPrice = newPrice;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError("A bill must contain at least one item.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    if (!customName.trim()) {
      setError("Custom item name is required");
      return;
    }
    const price = parseFloat(customPrice) || 0;
    const qty = parseInt(customQty) || 1;
    if (price < 0) {
      setError("Price cannot be negative");
      return;
    }

    setItems([
      ...items,
      {
        name: customName.trim(),
        quantity: qty,
        unitPrice: price,
        isCustom: true,
        category: "Custom",
      },
    ]);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setShowAddCustom(false);
    setError(null);
  };

  const subtotal = Math.round(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;
  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const newTotal = Math.max(0, Math.round((subtotal - numDiscount) * 100) / 100);
  const oldTotal = bill.totalAmount;
  const difference = Math.round((newTotal - oldTotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Bill must have at least one item");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError("A valid reason for this modification is required for financial auditing");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/credits/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          discount: numDiscount,
          notes: notes.trim() || null,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to edit bill");
      }

      onSuccess(data.bill);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update bill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl shadow-2xl border-amber-500/20 max-h-[92dvh] flex flex-col">
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Edit Credit Bill #{bill.billNumber}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer: <span className="font-semibold text-foreground">{bill.customer?.fullName}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Original Total</span>
              <span className="font-mono font-bold text-sm">Rs. {oldTotal.toLocaleString()}</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {bill.paidAmount > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold block">Partial Payments Recorded: Rs. {bill.paidAmount.toLocaleString()}</span>
                This bill already has payments recorded against it. Modifying this bill will preserve all past payment records intact and automatically log an auditable balance adjustment.
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bill Items ({items.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 rounded-lg"
                onClick={() => setShowAddCustom(!showAddCustom)}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            {/* Inline Add Custom Item Form */}
            {showAddCustom && (
              <div className="p-3 bg-muted/50 rounded-xl border space-y-3">
                <span className="text-xs font-semibold block">Add Custom Dish / Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Item name (e.g. Special Salad)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="h-8 text-xs sm:col-span-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Rate (Rs.)"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddCustom(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                    onClick={handleAddCustomItem}
                  >
                    Add to Bill
                  </Button>
                </div>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden divide-y text-xs">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground truncate">
                        {item.name}
                      </span>
                      {item.isCustom && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      Rs. {item.unitPrice} × {item.quantity} = Rs.{" "}
                      {Math.round(item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
                    <button
                      type="button"
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-background font-bold text-xs"
                      onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-mono font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-background font-bold text-xs"
                      onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  {/* Unit Price Input */}
                  <div className="w-24">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handlePriceChange(idx, parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs font-mono font-bold text-right"
                    />
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Discount & Calculations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Discount Amount (Rs.)</Label>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="h-9 font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bill Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                className="h-9"
              />
            </div>
          </div>

          {/* Mandatory Reason for Audit */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Reason for Bill Correction / Price Adjustment *
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this bill was corrected (e.g. Customer returned items, discount authorized by manager, corrected dish quantity)"
              rows={2}
              className="resize-none text-xs"
              required
            />
          </div>

          {/* Recalculation Summary Box */}
          <div className="p-4 bg-muted/40 rounded-xl border space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Items Subtotal:</span>
              <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
            </div>
            {numDiscount > 0 && (
              <div className="flex justify-between items-center text-rose-500 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- Rs. {numDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold text-sm text-foreground pt-1 border-t">
              <span>New Total Charge:</span>
              <span className="font-mono font-black text-base text-amber-500">
                Rs. {newTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed">
              <span className="text-muted-foreground">Adjustment Impact on Customer Debt:</span>
              <span
                className={`font-mono font-bold ${
                  difference > 0
                    ? "text-rose-500"
                    : difference < 0
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }`}
              >
                {difference > 0
                  ? `+ Rs. ${difference.toLocaleString()} (Debt Increases)`
                  : difference < 0
                  ? `- Rs. ${Math.abs(difference).toLocaleString()} (Debt Decreases)`
                  : "No Change in Total"}
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
              disabled={submitting || items.length === 0 || !reason.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  Save Bill Correction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
