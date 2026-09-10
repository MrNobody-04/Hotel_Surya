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

export default function StayBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [stay, setStay] = useState<StayDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Catalog items for quick selection
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Add Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState<BillItemCategory>("FOOD");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<string>("180");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);

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

  // When catalog item selected, auto-fill unit price and name
  const handleSelectCatalogItem = (catalogId: string) => {
    setSelectedCatalogItem(catalogId);
    const item = catalogItems.find((ci) => ci.id === catalogId);
    if (item) {
      setItemName(item.name);
      setItemUnitPrice(String(item.defaultPrice));
    }
  };

  // Add Item Handler
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    const unitPriceNum = Number(itemUnitPrice);
    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
      toast.error("Valid unit price is required");
      return;
    }

    setAddingItem(true);
    try {
      const res = await fetch(`/api/stays/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: itemCategory,
          name: itemName.trim(),
          quantity: itemQuantity,
          unitPrice: unitPriceNum,
          notes: itemNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add item");

      toast.success(`${itemName} added to bill`);
      setItemModalOpen(false);
      setItemName("");
      setItemQuantity(1);
      setItemNotes("");
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

  const filteredCatalog = catalogItems.filter(
    (ci) => ci.category === itemCategory
  );

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

          {stay.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentAmount(String(calc.outstandingBalance > 0 ? calc.outstandingBalance : ""));
                  setPaymentModalOpen(true);
                }}
                className="h-8 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Payment</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setItemModalOpen(true)}
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add F&B / Service</span>
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

      {/* Add Item Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddItem}>
            <DialogHeader>
              <DialogTitle>Add Item to Customer Bill</DialogTitle>
              <DialogDescription>
                Add food, beverages, or additional services to Room {stay.room.roomNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Category Picker */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(["FOOD", "DRINK", "SERVICE", "OTHER"] as BillItemCategory[]).map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={itemCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setItemCategory(cat);
                        setSelectedCatalogItem("");
                      }}
                      className="text-xs"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Catalog Quick Pick */}
              {filteredCatalog.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Quick Catalog Pick</Label>
                  <Select
                    value={selectedCatalogItem}
                    onValueChange={handleSelectCatalogItem}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Choose from catalog..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCatalog.map((ci) => (
                        <SelectItem key={ci.id} value={ci.id} className="text-xs">
                          {ci.name} — NPR {ci.defaultPrice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Item Name */}
              <div className="space-y-1.5">
                <Label htmlFor="itemName">Item Name *</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Steamed Chicken Momo"
                  required
                />
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unitPrice">Unit Price (NPR) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    inputMode="numeric"
                    step="10"
                    min="0"
                    value={itemUnitPrice}
                    onChange={(e) => setItemUnitPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Computed Subtotal */}
              <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs font-semibold">
                <span>Subtotal:</span>
                <span className="font-mono text-sm text-foreground">
                  {formatCurrency((itemQuantity || 1) * (Number(itemUnitPrice) || 0))}
                </span>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="itemNotes">Notes (Optional)</Label>
                <Input
                  id="itemNotes"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Less spicy, delivered to room"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemModalOpen(false)}
                disabled={addingItem}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingItem}>
                {addingItem ? "Adding..." : "Add to Bill"}
              </Button>
            </DialogFooter>
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
                    <SelectItem value="QR_PAYMENT">Fonepay / QR Payment</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                    <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
    </div>
  );
}
