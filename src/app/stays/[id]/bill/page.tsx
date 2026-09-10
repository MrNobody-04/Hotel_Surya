"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  PlusCircle,
  CreditCard,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Utensils,
  Coffee,
  Sparkles,
  Bed,
  User,
  Clock,
  Phone,
  Calendar,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { BillItemCategory, PaymentMethod, StayDTO } from "@/types";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";
import { DeleteStayModal } from "@/components/stays/delete-stay-modal";

export default function StayBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [stay, setStay] = useState<StayDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Catalog items for quick selection
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Add Items Modal (Supports batch adding multiple items at once)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemsList, setItemsList] = useState<Array<{
    id: string;
    category: BillItemCategory;
    name: string;
    quantity: string;
    unitPrice: string;
    notes?: string;
  }>>([{ id: "1", category: "FOOD", name: "", quantity: "1", unitPrice: "", notes: "" }]);
  const [addingItem, setAddingItem] = useState(false);

  // Payment QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchStay = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stays/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStay(data.stay);
      } else {
        toast.error("Failed to load stay bill");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/service-items");
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStay();
    fetchCatalog();
  }, [id]);

  // Batch Bill Item Helpers
  const createDefaultRow = (cat: BillItemCategory = "FOOD") => ({
    id: Math.random().toString(36).substring(2, 9),
    category: cat,
    name: "",
    quantity: "1",
    unitPrice: "",
    notes: "",
  });

  const handleAddCatalogItemToBatch = (ci: { name: string; category?: string; defaultPrice: number }) => {
    setItemsList((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.name.trim() && !last.unitPrice) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            category: (ci.category as BillItemCategory) || "FOOD",
            name: ci.name,
            quantity: "1",
            unitPrice: String(ci.defaultPrice),
          },
        ];
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          category: (ci.category as BillItemCategory) || "FOOD",
          name: ci.name,
          quantity: "1",
          unitPrice: String(ci.defaultPrice),
          notes: "",
        },
      ];
    });
  };

  const handleUpdateItemRow = (rowId: string, field: string, value: any) => {
    setItemsList((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleAddEmptyRow = () => {
    setItemsList((prev) => [...prev, createDefaultRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setItemsList((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return filtered.length > 0 ? filtered : [createDefaultRow()];
    });
  };

  const batchTotal = itemsList.reduce((sum, item) => {
    const q = Math.max(1, parseInt(item.quantity) || 1);
    const p = Math.max(0, Number(item.unitPrice) || 0);
    return sum + q * p;
  }, 0);

  // Batch Add Items Handler
  const handleAddBatchItems = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = itemsList.filter((r) => r.name.trim() || Number(r.unitPrice) > 0);
    if (validRows.length === 0) {
      toast.error("Please add at least one item with a name and price");
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (!r.name.trim()) {
        toast.error(`Item #${i + 1} is missing a name`);
        return;
      }
      const price = Number(r.unitPrice);
      if (isNaN(price) || price < 0) {
        toast.error(`Item #${i + 1} (${r.name}) has an invalid unit price`);
        return;
      }
    }

    setAddingItem(true);
    try {
      const payload = {
        items: validRows.map((r) => ({
          category: r.category,
          name: r.name.trim(),
          quantity: Math.max(1, parseInt(r.quantity) || 1),
          unitPrice: Number(r.unitPrice),
          notes: r.notes?.trim() || null,
        })),
      };

      const res = await fetch(`/api/stays/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add items");

      toast.success(`Successfully added ${validRows.length} item(s) to bill!`);
      setItemModalOpen(false);
      setItemsList([createDefaultRow()]);
      fetchStay();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingItem(false);
    }
  };

  // Record Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Valid payment amount required");
      return;
    }

    setRecordingPayment(true);
    try {
      const idempotencyKey = `pay_${id}_${Date.now()}`;
      const res = await fetch(`/api/stays/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          method: paymentMethod,
          notes: paymentNotes || null,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      toast.success(`Payment of ${formatCurrency(amountNum)} recorded`);
      setPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
      fetchStay();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !stay) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
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
            Back to Dashboard
          </Button>
        </Link>
      </div>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <Link href="/guests">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guests</span>
            </Button>
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-semibold">Stay #{stay.id.slice(-6)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="h-8 gap-1.5 border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700"
            title="Delete this stay record"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Stay</span>
          </Button>

          {stay.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(true)}
                className="h-8 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Payment</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrModalOpen(true)}
                className="h-8 gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Payment QR</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setItemModalOpen(true)}
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Items to Bill</span>
              </Button>

              <Link href={`/stays/${stay.id}/checkout`}>
                <Button size="sm" className="h-8 gap-1.5 bg-primary">
                  <span>Go to Checkout</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Unified Bill Card / Print Invoice */}
      <Card className="shadow-lg border-2 border-border overflow-hidden">
        {/* Hotel Surya Printable Header */}
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                HOTEL SURYA
              </h2>
              <p className="text-xs text-muted-foreground">
                Pokhara, Nepal • Tel: +977 61-532100 • info@hotelsurya.com
              </p>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  Receipt #{stay.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant={stay.status === "ACTIVE" ? "info" : "secondary"}>
                  {stay.status === "ACTIVE" ? "LIVE UNIFIED BILL" : "FINALIZED / CHECKED OUT"}
                </Badge>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs space-y-1">
              <div className="font-semibold text-sm">Room {stay.room.roomNumber} ({stay.room.type})</div>
              <div className="text-muted-foreground">
                Check-In: {formatNepalDateTime(stay.checkInAt)}
              </div>
              <div className="text-muted-foreground">
                {stay.checkoutAt
                  ? `Checkout: ${formatNepalDateTime(stay.checkoutAt)}`
                  : `Exp. Checkout: ${formatNepalDateTime(stay.expectedCheckoutDate)}`}
              </div>
            </div>
          </div>

          {/* Guest Info Bar */}
          <div className="mt-4 p-3 bg-background border rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Primary Guest:</span>
              <span className="font-bold text-sm text-foreground">
                {stay.customer.fullName} ({stay.customer.gender})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Contact & ID:</span>
              <span className="font-medium text-foreground">
                {stay.customer.contactNumber}
                {stay.customer.citizenshipNumber && ` • ${stay.customer.citizenshipNumber}`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Guests in Room:</span>
              <span className="font-medium text-foreground">
                {stay.numberOfPeople} Person(s)
                {stay.accompanyingGuests?.length > 0 &&
                  ` (with ${stay.accompanyingGuests.map((g) => g.fullName).join(", ")})`}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Itemized Charges Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Itemized Charges & Services
              </h3>
              {stay.status === "ACTIVE" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItemModalOpen(true)}
                  className="h-7 text-xs gap-1 no-print"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Item</span>
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Price</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Room Charge (Row 1) */}
                  <tr className="bg-primary/5 font-medium">
                    <td className="px-3 py-2.5">
                      <Badge variant="purple" className="text-[10px]">ROOM</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      Room {stay.room.roomNumber} ({stay.room.type}) Negotiated Stay Rate
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono">1</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatCurrency(stay.roomPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      {formatCurrency(stay.roomPrice)}
                    </td>
                  </tr>

                  {/* F&B and Other Bill Items */}
                  {stay.billItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            item.category === "FOOD"
                              ? "warning"
                              : item.category === "DRINK"
                              ? "info"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{item.name}</span>
                        {item.notes && (
                          <span className="text-xs text-muted-foreground block">
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments History Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Payments Received ({stay.payments.length})
              </h3>
              {stay.status === "ACTIVE" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPaymentAmount(String(calc.outstandingBalance > 0 ? calc.outstandingBalance : ""));
                    setPaymentModalOpen(true);
                  }}
                  className="h-7 text-xs gap-1 no-print"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Record Payment</span>
                </Button>
              )}
            </div>

            {stay.payments.length === 0 ? (
              <div className="p-4 text-center border rounded-lg text-xs text-muted-foreground">
                No payments recorded yet for this stay.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                    <tr>
                      <th className="px-3 py-2">Timestamp (Nepal Time)</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Notes / Ref</th>
                      <th className="px-3 py-2">Recorded By</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {stay.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatNepalDateTime(p.timestamp)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Badge variant="outline" className="text-[10px]">
                            {p.method}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.notes || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {p.recordedByName || "Staff"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Financial Calculation Summary Box */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end">
            <div className="w-full sm:w-80 p-4 bg-muted/30 border rounded-xl space-y-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Room Charges:</span>
                <span className="font-mono">{formatCurrency(calc.roomCharge)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Food & Drinks:</span>
                <span className="font-mono">
                  {formatCurrency(calc.foodTotal + calc.drinkTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Services & Other:</span>
                <span className="font-mono">
                  {formatCurrency(calc.serviceTotal + calc.otherTotal)}
                </span>
              </div>
              <div className="pt-2 border-t flex items-center justify-between font-bold text-base">
                <span>Total Bill:</span>
                <span className="font-mono">{formatCurrency(calc.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600 font-bold">
                <span>Total Paid:</span>
                <span className="font-mono">{formatCurrency(calc.paidAmount)}</span>
              </div>
              <div className="pt-2 border-t flex items-center justify-between text-lg font-black">
                <span>Balance Due:</span>
                <span
                  className={`font-mono ${
                    calc.outstandingBalance > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600"
                  }`}
                >
                  {calc.outstandingBalance > 0
                    ? formatCurrency(calc.outstandingBalance)
                    : "PAID (NPR 0)"}
                </span>
              </div>

              {calc.outstandingBalance > 0 && (
                <div className="pt-2 no-print">
                  <Button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs shadow-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR to Settle ({formatCurrency(calc.outstandingBalance)})</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Signature Area for Printing */}
          <div className="hidden print:block pt-16 border-t mt-12 text-xs">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="w-48 border-b border-black"></div>
                <div>Guest Signature</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="w-48 border-b border-black"></div>
                <div>Authorized Cashier / Stamp</div>
                <div className="text-[10px] text-muted-foreground">Hotel Surya, Pokhara</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Item Batch Add Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <form onSubmit={handleAddBatchItems} className="flex flex-col flex-1 overflow-hidden space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                <span>Add Items to Customer Bill</span>
              </DialogTitle>
              <DialogDescription>
                Add one or multiple food, drink, or service items at once to Room {stay.room.roomNumber}
              </DialogDescription>
            </DialogHeader>

            {/* Quick Catalog Bar */}
            {catalogItems.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Add from Menu & Services Catalog
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {catalogItems.map((ci) => (
                    <Button
                      key={ci.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCatalogItemToBatch(ci)}
                      className="h-7 text-xs px-2.5 py-0.5 gap-1 hover:border-primary hover:text-primary"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{ci.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        (NPR {ci.defaultPrice})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {itemsList.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-card border rounded-xl space-y-2 relative shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      Item #{index + 1}
                    </span>
                    {itemsList.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(item.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Category */}
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground">Category</Label>
                      <Select
                        value={item.category}
                        onValueChange={(val: any) => handleUpdateItemRow(item.id, "category", val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FOOD">Food</SelectItem>
                          <SelectItem value="DRINK">Drink</SelectItem>
                          <SelectItem value="SERVICE">Service</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Name */}
                    <div className="sm:col-span-4">
                      <Label className="text-[10px] text-muted-foreground">Item Name *</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. Steamed Momo"
                        value={item.name}
                        onChange={(e) => handleUpdateItemRow(item.id, "name", e.target.value)}
                        required
                      />
                    </div>

                    {/* Qty */}
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Qty *</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        className="h-8 text-xs font-mono"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemRow(item.id, "quantity", e.target.value)}
                        onBlur={() => {
                          if (!item.quantity || parseInt(item.quantity) < 1) {
                            handleUpdateItemRow(item.id, "quantity", "1");
                          }
                        }}
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground">Price (NPR) *</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        className="h-8 text-xs font-mono font-bold"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItemRow(item.id, "unitPrice", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Input
                      className="h-7 text-[11px] max-w-sm"
                      placeholder="Notes (optional, e.g. Less spicy, Room delivery)"
                      value={item.notes || ""}
                      onChange={(e) => handleUpdateItemRow(item.id, "notes", e.target.value)}
                    />
                    <div className="text-right font-mono font-semibold text-muted-foreground">
                      Subtotal:{" "}
                      <span className="text-foreground">
                        {formatCurrency(
                          (Math.max(1, parseInt(item.quantity) || 1)) *
                            (Math.max(0, Number(item.unitPrice) || 0))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmptyRow}
                className="h-8 gap-1 text-xs w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Item</span>
              </Button>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <div className="text-xs">
                  Batch Total:{" "}
                  <span className="font-mono text-base font-bold text-foreground">
                    {formatCurrency(batchTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItemModalOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingItem}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    {addingItem ? "Saving Items..." : `Add ${itemsList.filter(r => r.name.trim()).length || itemsList.length} Item(s)`}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Guest Payment</DialogTitle>
              <DialogDescription>
                Record partial or full settlement for Room {stay.room.roomNumber}. Never overwrites previous payments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs">
                <span>Outstanding Balance:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                  {formatCurrency(calc.outstandingBalance)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payAmount">Payment Amount (NPR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">
                    NPR
                  </span>
                  <Input
                    id="payAmount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    className="pl-12 font-mono font-bold text-base"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payMethod">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                >
                  <SelectTrigger id="payMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="QR_PAYMENT">Fonepay / QR Payment (Nabil Bank)</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                    <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show QR banner inside payment modal when QR_PAYMENT selected */}
              {paymentMethod === "QR_PAYMENT" && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2 text-center">
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Nabil Bank Official QR (SUJAN G.C.)</span>
                  </div>
                  <img
                    src="/images/nabil-qr.jpg"
                    alt="Nabil Bank QR"
                    className="max-w-[170px] h-auto mx-auto rounded-lg border shadow-sm"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Account: <span className="font-mono font-bold text-foreground">27710017501941</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="payNotes">Transaction Note / Reference (Optional)</Label>
                <Input
                  id="payNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Fonepay Txn ID #9823412"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModalOpen(false)}
                disabled={recordingPayment}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {recordingPayment ? "Saving Payment..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standalone Payment QR Modal */}
      <PaymentQrModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        dueAmount={calc.outstandingBalance}
        roomNumber={stay.room.roomNumber}
        guestName={stay.customer.fullName}
      />

      {/* Delete Stay Modal */}
      <DeleteStayModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        stay={
          stay
            ? {
                id: stay.id,
                roomNumber: stay.room.roomNumber,
                guestName: stay.customer.fullName,
                status: stay.status,
              }
            : null
        }
        onSuccess={() => {
          router.push(stay?.status === "ACTIVE" ? "/guests" : "/stays");
        }}
      />
    </div>
  );
}
