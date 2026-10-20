"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  Trash2,
  Edit3,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  User,
  ShieldAlert,
  Loader2,
  Wallet,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CompanyDTO, CompanyPaymentDTO, PaymentMethod } from "@/types";
import { TiltCard } from "@/components/ui/tilt-card";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatCurrency, formatNepalDateTime } from "@/lib/utils";

export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState<"companies" | "payments">("companies");
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [payments, setPayments] = useState<CompanyPaymentDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals state
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [targetCompany, setTargetCompany] = useState<CompanyDTO | null>(null);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyDTO | null>(null);

  const [statementModalCompany, setStatementModalCompany] = useState<CompanyDTO | null>(null);
  const [receiptModalPayment, setReceiptModalPayment] = useState<CompanyPaymentDTO | null>(null);

  // Form states for Record Payment
  const [paymentCompanyId, setPaymentCompanyId] = useState<string>("NEW");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentPurpose, setPaymentPurpose] = useState("Corporate Stay Settlement");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form states for Add/Edit Company
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submittingCompany, setSubmittingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "company" | "payment";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Current User
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch Companies and Payments
  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, pmtRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/companies/payments"),
      ]);

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.companies || []);
      }
      if (pmtRes.ok) {
        const pmtData = await pmtRes.json();
        setPayments(pmtData.payments || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load company records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayCollected = payments
      .filter((p) => new Date(p.paymentDate) >= startOfToday)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthCollected = payments
      .filter((p) => new Date(p.paymentDate) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCollected,
      todayCollected,
      monthCollected,
      companiesCount: companies.length,
      paymentsCount: payments.length,
    };
  }, [companies, payments]);

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

  // Open Record Payment Modal
  const handleOpenRecordPayment = (company?: CompanyDTO) => {
    setPaymentError(null);
    if (company) {
      setPaymentCompanyId(company.id);
      setNewCompanyName("");
    } else {
      setPaymentCompanyId(companies.length > 0 ? companies[0].id : "NEW");
      setNewCompanyName("");
    }
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentPurpose("Corporate Stay Settlement");
    setPaymentReference("");
    setPaymentNotes("");
    setRecordPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError("Amount must be greater than zero");
      return;
    }

    if (paymentCompanyId === "NEW" && !newCompanyName.trim()) {
      setPaymentError("Please enter a company name");
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentError(null);

      const res = await fetch("/api/companies/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: paymentCompanyId !== "NEW" ? paymentCompanyId : null,
          companyName: paymentCompanyId === "NEW" ? newCompanyName.trim() : null,
          amount: numAmount,
          paymentMethod,
          paymentDate,
          purpose: paymentPurpose,
          referenceNumber: paymentReference.trim() || null,
          notes: paymentNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      toast.success(
        `Payment of Rs. ${numAmount.toLocaleString()} recorded successfully!`
      );
      setRecordPaymentModalOpen(false);
      setReceiptModalPayment(data.payment);
      fetchData();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Add/Edit Company Modal
  const handleOpenCompanyModal = (company?: CompanyDTO) => {
    setCompanyError(null);
    if (company) {
      setEditingCompany(company);
      setFormCompanyName(company.name);
      setFormContactPerson(company.contactPerson || "");
      setFormPhone(company.phone || "");
      setFormEmail(company.email || "");
      setFormAddress(company.address || "");
      setFormNotes(company.notes || "");
    } else {
      setEditingCompany(null);
      setFormCompanyName("");
      setFormContactPerson("");
      setFormPhone("");
      setFormEmail("");
      setFormAddress("");
      setFormNotes("");
    }
    setCompanyModalOpen(true);
  };

  // Save Company
  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompanyName.trim()) {
      setCompanyError("Company name is required");
      return;
    }

    try {
      setSubmittingCompany(true);
      setCompanyError(null);

      const url = editingCompany
        ? `/api/companies/${editingCompany.id}`
        : "/api/companies";
      const method = editingCompany ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formCompanyName.trim(),
          contactPerson: formContactPerson.trim() || null,
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          address: formAddress.trim() || null,
          notes: formNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save company");

      toast.success(
        editingCompany ? "Company updated successfully" : "Company registered successfully"
      );
      setCompanyModalOpen(false);
      fetchData();
    } catch (err: any) {
      setCompanyError(err.message || "Failed to save company");
    } finally {
      setSubmittingCompany(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      const url =
        itemToDelete.type === "company"
          ? `/api/companies/${itemToDelete.id}`
          : `/api/companies/payments/${itemToDelete.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      toast.success(
        itemToDelete.type === "company"
          ? `Company "${itemToDelete.name}" deleted`
          : "Payment record deleted"
      );
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Delete operation failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Company Payments & Accounts
                </h1>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Finance & Records
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record corporate settlements, manage company accounts, and view overall analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCompanyModal()}
            className="text-xs gap-1.5 h-9"
          >
            <Building className="w-3.5 h-3.5" />
            + New Company
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenRecordPayment()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TiltCard variant="kpi" maxTilt={3} className="shadow-sm border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs uppercase font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" />
              <span>Total Received</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              Rs. {stats.totalCollected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across {stats.paymentsCount} company settlements
            </p>
          </CardContent>
        </TiltCard>

        <TiltCard variant="kpi" maxTilt={3} className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/20">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs uppercase font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>This Month</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black font-mono text-foreground">
              Rs. {stats.monthCollected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Corporate collections this month
            </p>
          </CardContent>
        </TiltCard>

        <TiltCard variant="kpi" maxTilt={3} className="shadow-sm border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/20">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Today&apos;s Receipts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black font-mono text-foreground">
              Rs. {stats.todayCollected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Received today from companies
            </p>
          </CardContent>
        </TiltCard>

        <TiltCard variant="kpi" maxTilt={3} className="shadow-sm border-l-4 border-l-purple-500 bg-purple-50/20 dark:bg-purple-950/20">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs uppercase font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Corporate Clients</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black font-mono text-foreground">
              {stats.companiesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registered companies & organizations
            </p>
          </CardContent>
        </TiltCard>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 border-b pb-2">
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border">
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "companies"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Company Accounts ({companies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "payments"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Payment Transactions ({payments.length})
          </button>
        </div>

        {activeTab === "companies" && (
          <div className="relative w-72 max-w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* TAB 1: COMPANIES DESK */}
      {activeTab === "companies" && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Loading company accounts...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl bg-muted/20 space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
              <h3 className="font-bold text-base text-foreground">No Companies Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? `No company matching "${searchQuery}".`
                  : "No companies registered yet. Add a new company or record a payment to get started."}
              </p>
              <Button
                size="sm"
                onClick={() => handleOpenCompanyModal()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" />
                Register First Company
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((comp) => (
                <div
                  key={comp.id}
                  className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-foreground line-clamp-1">
                          {comp.name}
                        </h3>
                        {comp.contactPerson ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{comp.contactPerson}</span>
                          </p>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">
                            No contact person specified
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="font-mono text-xs bg-muted/40">
                        {comp.paymentsCount} {comp.paymentsCount === 1 ? "payment" : "payments"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">
                          Total Received
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          Rs. {comp.totalReceived.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">
                          Last Payment
                        </span>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          {comp.lastPaymentDate
                            ? new Date(comp.lastPaymentDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "None"}
                        </span>
                      </div>
                    </div>

                    {(comp.phone || comp.address) && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {comp.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-mono">{comp.phone}</span>
                          </div>
                        )}
                        {comp.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{comp.address}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenRecordPayment(comp)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1 shadow-sm flex-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Record Payment
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatementModalCompany(comp);
                      }}
                      className="text-xs h-8 px-2.5"
                      title="View Company Statement"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenCompanyModal(comp)}
                      className="text-xs h-8 w-8 p-0"
                      title="Edit Company Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>

                    {(currentUser?.role === "OWNER" || currentUser?.role === "MANAGER") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItemToDelete({
                            type: "company",
                            id: comp.id,
                            name: comp.name,
                          });
                          setDeleteModalOpen(true);
                        }}
                        className="text-xs h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT TRANSACTIONS LEDGER */}
      {activeTab === "payments" && (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="p-4 bg-muted/40 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                Corporate Payment Ledger
              </h3>
              <p className="text-xs text-muted-foreground">
                Chronological audit trail of all payments received from corporate partners
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenRecordPayment()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8 shadow-sm shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              + Record Payment
            </Button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Loading payment ledger...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No payments recorded yet. Click &quot;Record Payment&quot; to log your first company collection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Purpose / Reference</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount (Rs.)</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {pmt.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(pmt.paymentDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {pmt.company?.name || "Company"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground block">
                          {pmt.purpose || "Corporate Payment"}
                        </span>
                        {pmt.referenceNumber && (
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            Ref: {pmt.referenceNumber}
                          </span>
                        )}
                        {pmt.notes && (
                          <span className="text-[11px] text-muted-foreground block italic">
                            &quot;{pmt.notes}&quot;
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            pmt.paymentMethod === "CASH"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : pmt.paymentMethod === "QR_PAYMENT"
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }
                        >
                          {pmt.paymentMethod.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                        Rs. {pmt.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {pmt.recordedBy?.name || "Staff"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptModalPayment(pmt)}
                            className="h-7 text-xs px-2 gap-1"
                            title="Print Payment Receipt"
                          >
                            <Printer className="w-3 h-3" />
                            Receipt
                          </Button>

                          {(currentUser?.role === "OWNER" || currentUser?.role === "MANAGER") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setItemToDelete({
                                  type: "payment",
                                  id: pmt.id,
                                  name: `${pmt.receiptNumber} (Rs. ${pmt.amount.toLocaleString()})`,
                                });
                                setDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: RECORD COMPANY PAYMENT
      ===================================================================== */}
      <Dialog
        open={recordPaymentModalOpen}
        onOpenChange={(open) => !open && !submittingPayment && setRecordPaymentModalOpen(false)}
      >
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl shadow-2xl border-emerald-500/20">
          <DialogHeader className="p-4 sm:p-5 shrink-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  Record Company Payment
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record funds received from corporate clients, agencies, or contractors
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitPayment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 touch-pan-y">
              {paymentError && (
                <div className="p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Company Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Company / Client *</Label>
                <Select
                  value={paymentCompanyId}
                  onValueChange={(val) => setPaymentCompanyId(val)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.contactPerson ? `(${c.contactPerson})` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value="NEW">+ Register New Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Company Name input if 'NEW' selected */}
              {paymentCompanyId === "NEW" && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Label className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    New Company Name *
                  </Label>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Nepal Telecom, ABC Engineering"
                    className="h-10 bg-background"
                    required
                  />
                </div>
              )}

              {/* Payment Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Amount Paid (Rs.) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                      Rs.
                    </span>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 font-mono text-base font-bold h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Payment Method & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <SelectItem value="CASH">Cash Settlement</SelectItem>
                      <SelectItem value="QR_PAYMENT">Fonepay / QR Code</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                      <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                      <SelectItem value="OTHER">Cheque / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Purpose / Category</Label>
                  <Select
                    value={paymentPurpose}
                    onValueChange={(val) => setPaymentPurpose(val)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corporate Stay Settlement">Corporate Stay Settlement</SelectItem>
                      <SelectItem value="Hall & Event Booking">Hall & Event Booking</SelectItem>
                      <SelectItem value="Bulk Catering / Food">Bulk Catering / Food</SelectItem>
                      <SelectItem value="Monthly Corporate Bill">Monthly Corporate Bill</SelectItem>
                      <SelectItem value="Advance Deposit">Advance Deposit</SelectItem>
                      <SelectItem value="Other Payment">Other Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reference Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reference / Cheque / Voucher # (Optional)</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. Cheque #49281, ConnectIPS Txn ID, Voucher Ref"
                  className="h-10"
                />
              </div>

              {/* Remarks / Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Remarks / Notes (Optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Handed over by Mr. Sharma, includes 3 room stays"
                  rows={1}
                  className="resize-none text-xs min-h-[38px]"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 p-3 sm:p-4 bg-muted/40 border-t flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submittingPayment}
                onClick={() => setRecordPaymentModalOpen(false)}
                className="h-10 text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md h-10 text-xs sm:text-sm px-4 flex-1 sm:flex-initial"
              >
                {submittingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Payment (Rs. {parseFloat(paymentAmount || "0").toLocaleString()})
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 2: ADD / EDIT COMPANY
      ===================================================================== */}
      <Dialog
        open={companyModalOpen}
        onOpenChange={(open) => !open && !submittingCompany && setCompanyModalOpen(false)}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden sm:rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30">
            <DialogTitle className="text-lg font-bold">
              {editingCompany ? "Edit Company" : "Register New Company"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCompany} className="p-4 sm:p-5 space-y-3.5">
            {companyError && (
              <div className="p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{companyError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Company / Organization Name *</Label>
              <Input
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value)}
                placeholder="e.g. Nepal Telecom, Ncell, Everest Bank"
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  placeholder="e.g. Ramesh Thapa"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9801234567"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Office Address / Location</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. Birendranagar, Surkhet"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Contract Details</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Corporate billing notes, special corporate tariff, etc."
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={submittingCompany}
                onClick={() => setCompanyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingCompany || !formCompanyName.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {submittingCompany ? "Saving..." : editingCompany ? "Save Changes" : "Register Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 3: PAYMENT RECEIPT PREVIEW & PRINT
      ===================================================================== */}
      <Dialog
        open={Boolean(receiptModalPayment)}
        onOpenChange={(open) => !open && setReceiptModalPayment(null)}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden sm:rounded-2xl shadow-2xl">
          <div className="p-6 bg-white text-slate-900 print:p-0 space-y-4" id="company-payment-receipt">
            {/* Receipt Header */}
            <div className="text-center border-b pb-3 space-y-1">
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-950">
                NEW HOTEL SURYA
              </h2>
              <p className="text-xs text-slate-600">
                Birendranagar-6, Surkhet, Nepal • Tel: 083-520000
              </p>
              <Badge variant="outline" className="text-xs mt-1 border-slate-300 text-slate-700">
                CORPORATE PAYMENT RECEIPT
              </Badge>
            </div>

            {/* Receipt Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-bold text-slate-900">
                  {receiptModalPayment?.receiptNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-mono text-slate-900">
                  {receiptModalPayment?.paymentDate &&
                    new Date(receiptModalPayment.paymentDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-slate-500">Received From:</span>
                <span className="font-bold text-slate-950 text-sm">
                  {receiptModalPayment?.company?.name}
                </span>
              </div>
              {receiptModalPayment?.purpose && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Purpose:</span>
                  <span className="text-slate-800 font-medium">
                    {receiptModalPayment.purpose}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-800">
                  {receiptModalPayment?.paymentMethod.replace("_", " ")}
                </span>
              </div>
              {receiptModalPayment?.referenceNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Ref / Cheque #:</span>
                  <span className="font-mono text-slate-800">
                    {receiptModalPayment.referenceNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Box */}
            <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-center space-y-0.5">
              <span className="text-[11px] text-slate-600 block uppercase font-semibold">
                Amount Received
              </span>
              <span className="text-2xl font-black font-mono text-emerald-700">
                Rs. {receiptModalPayment?.amount.toLocaleString()}
              </span>
            </div>

            {receiptModalPayment?.notes && (
              <p className="text-xs text-slate-500 italic">
                Note: {receiptModalPayment.notes}
              </p>
            )}

            {/* Signature Footer */}
            <div className="pt-6 border-t flex justify-between items-end text-xs text-slate-600">
              <div>
                <span>Received By:</span>
                <span className="block font-bold text-slate-900">
                  {receiptModalPayment?.recordedBy?.name || "Cashier / Front Desk"}
                </span>
              </div>
              <div className="text-center">
                <div className="w-28 border-b border-dashed border-slate-400 mb-1" />
                <span>Authorized Sign</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-muted/40 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReceiptModalPayment(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 4: COMPANY STATEMENT
      ===================================================================== */}
      <Dialog
        open={Boolean(statementModalCompany)}
        onOpenChange={(open) => !open && setStatementModalCompany(null)}
      >
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-0 overflow-hidden sm:rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {statementModalCompany?.name} — Account Statement
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete history of payments received from {statementModalCompany?.name}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border text-xs">
              <div>
                <span className="text-muted-foreground block">Total Payments Received</span>
                <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
                  Rs. {statementModalCompany?.totalReceived.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Transactions</span>
                <span className="font-mono font-bold text-lg text-foreground">
                  {statementModalCompany?.paymentsCount}
                </span>
              </div>
            </div>

            {/* List of payments for this company */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">
                Payment History
              </h4>
              {payments.filter((p) => p.companyId === statementModalCompany?.id).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No payments on record for this company yet.
                </p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden bg-card text-xs">
                  {payments
                    .filter((p) => p.companyId === statementModalCompany?.id)
                    .map((pmt) => (
                      <div key={pmt.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {pmt.receiptNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {pmt.paymentMethod.replace("_", " ")}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            {new Date(pmt.paymentDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            • {pmt.purpose || "Payment"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                            Rs. {pmt.amount.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptModalPayment(pmt);
                            }}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <Printer className="w-3 h-3" />
                            Print Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-3 bg-muted/40 border-t flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenRecordPayment(statementModalCompany || undefined)}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Record New Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatementModalCompany(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          DELETE CONFIRMATION MODAL
      ===================================================================== */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && !deleting && setDeleteModalOpen(false)}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full p-6 sm:rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Delete {itemToDelete?.type === "company" ? "Company Account" : "Payment Record"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This action will permanently delete &quot;{itemToDelete?.name}&quot;
                </p>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            {itemToDelete?.type === "company"
              ? "Deleting this company will also remove its associated payment history from company records. Financial analytics totals will automatically recalculate."
              : "Deleting this payment will remove it from the company ledger and adjust total revenue figures accordingly."}
          </p>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
