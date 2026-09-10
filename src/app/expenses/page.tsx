"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Receipt,
  PlusCircle,
  Download,
  Filter,
  Trash2,
  Calendar,
  DollarSign,
  Upload,
  Camera,
  X,
  Eye,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatNepalDate } from "@/lib/utils";
import { toast } from "sonner";
import { ExpenseCategory, ExpenseDTO, PaymentMethod } from "@/types";

const CATEGORIES: { label: string; value: ExpenseCategory }[] = [
  { label: "Staff Salary", value: "SALARY" },
  { label: "Kitchen / Food Purchase", value: "FOOD_PURCHASE" },
  { label: "Electricity (NEA)", value: "ELECTRICITY" },
  { label: "Water Supply", value: "WATER" },
  { label: "Internet & Wi-Fi", value: "INTERNET" },
  { label: "Cooking Gas (LPG)", value: "GAS" },
  { label: "Maintenance & Repairs", value: "MAINTENANCE" },
  { label: "Cleaning & Housekeeping", value: "CLEANING" },
  { label: "Hotel Supplies & Toiletries", value: "SUPPLIES" },
  { label: "Transportation / Fuel", value: "TRANSPORTATION" },
  { label: "Property Rent", value: "RENT" },
  { label: "Equipment Repairs", value: "REPAIRS" },
  { label: "Marketing / Advertisements", value: "MARKETING" },
  { label: "Other Operational Expense", value: "OTHER" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("FOOD_PURCHASE");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View Receipt Modal
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url =
        categoryFilter !== "ALL"
          ? `/api/expenses?category=${categoryFilter}`
          : `/api/expenses`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Receipt size exceeds 5MB limit");
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Valid title and amount are required");
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl = null;

      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        formData.append("category", "receipts");

        const uploadRes = await fetch("/api/uploads/receipts", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: amountNum,
          category,
          date: new Date(date).toISOString(),
          paymentMethod,
          notes: notes.trim() || null,
          receiptUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record expense");

      toast.success("Expense recorded successfully");
      setCreateOpen(false);
      setTitle("");
      setAmount("");
      setNotes("");
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete expense "${title}"?`)) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete expense");
      }
      toast.success("Expense deleted");
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const headers = ["Title", "Category", "Amount (NPR)", "Date", "Payment Method", "Recorded By", "Notes"];
    const rows = expenses.map((e) => [
      `"${e.title}"`,
      e.category,
      e.amount,
      `"${formatNepalDate(e.date)}"`,
      e.paymentMethod,
      `"${e.createdByName || "Staff"}"`,
      `"${e.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hotel_surya_expenses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expenses exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hotel Expenses
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and categorize operational hotel outflows (separate from customer bills)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-1.5"
            disabled={expenses.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
            Total Filtered Outflow
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
            {formatCurrency(totalAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {expenses.length} recorded expense transactions
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 border rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Category:</span>
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Expense Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-xs text-muted-foreground">
          Showing {expenses.length} records
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="font-semibold text-foreground">No Expenses Recorded</div>
              <p className="text-xs max-w-sm mx-auto">
                No expense entries found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Expense Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3 text-right">Amount (NPR)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatNepalDate(exp.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-xs text-muted-foreground">{exp.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {exp.paymentMethod}
                      </td>
                      <td className="px-4 py-3">
                        {exp.receiptUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewReceiptUrl(exp.receiptUrl || null)}
                            className="h-6 text-[11px] text-primary gap-1 px-2"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateExpense}>
            <DialogHeader>
              <DialogTitle>Record Operational Expense</DialogTitle>
              <DialogDescription>
                Record outgoing payment for hotel maintenance, kitchen, salaries, or utilities.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="expTitle">Expense Title / Description *</Label>
                <Input
                  id="expTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fresh vegetables for kitchen"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expAmount">Amount (NPR) *</Label>
                  <Input
                    id="expAmount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expDate">Date</Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expCategory">Category *</Label>
                <Select
                  value={category}
                  onValueChange={(val: any) => setCategory(val)}
                >
                  <SelectTrigger id="expCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expMethod">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                >
                  <SelectTrigger id="expMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                    <SelectItem value="QR_PAYMENT">QR / Fonepay</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Receipt */}
              <div className="space-y-2 p-3 bg-muted/40 border border-dashed rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Expense Receipt / Invoice (Optional)
                  </Label>
                  {receiptPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="h-6 text-xs text-destructive hover:text-destructive"
                    >
                      <X className="w-3 h-3 mr-1" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>

                {receiptPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    className="h-20 w-32 object-cover rounded border"
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      ref={fileInputRef}
                      onChange={handleReceiptSelect}
                      className="hidden"
                      id="expense-receipt-file"
                    />
                    <label htmlFor="expense-receipt-file">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-xs gap-1 h-7"
                        asChild
                      >
                        <span>
                          <Upload className="w-3 h-3" />
                          <span>Attach Receipt</span>
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expNotes">Notes (Optional)</Label>
                <Input
                  id="expNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid to Ram store"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submitting ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer Modal */}
      <Dialog
        open={Boolean(viewReceiptUrl)}
        onOpenChange={(open) => !open && setViewReceiptUrl(null)}
      >
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Expense Receipt Document</span>
            </DialogTitle>
          </DialogHeader>

          {viewReceiptUrl && (
            <div className="py-2 flex justify-center bg-black/5 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewReceiptUrl}
                alt="Receipt Document"
                className="max-h-96 object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
