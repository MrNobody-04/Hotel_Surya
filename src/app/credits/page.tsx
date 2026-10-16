"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Receipt,
  UserPlus,
  RefreshCw,
  Edit3,
  Printer,
  ChevronRight,
  Sparkles,
  Utensils,
  Trash2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RecordPaymentModal } from "@/components/credits/record-payment-modal";
import { EditBillModal } from "@/components/credits/edit-bill-modal";
import { CustomerLedgerModal } from "@/components/credits/customer-ledger-modal";
import { CreditReceiptModal } from "@/components/credits/credit-receipt-modal";
import {
  CreditAccountDTO,
  CreditBillDTO,
  CreditPaymentDTO,
  CreditDashboardMetricsDTO,
  ServiceItemDTO,
  MenuCategoryDTO,
  CustomerDTO,
  SessionUser,
} from "@/types";

interface TrayItem {
  serviceItemId?: string | null;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  isCustom?: boolean;
  notes?: string | null;
}

export default function CreditManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [user, setUser] = useState<SessionUser | null>(null);

  // Dashboard Data
  const [dashboardMetrics, setDashboardMetrics] = useState<CreditDashboardMetricsDTO | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  // Accounts Data
  const [accounts, setAccounts] = useState<CreditAccountDTO[]>([]);
  const [accountsTotal, setAccountsTotal] = useState<number>(0);
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>("ALL");
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);

  // Bills Data
  const [pendingBills, setPendingBills] = useState<CreditBillDTO[]>([]);
  const [paidBills, setPaidBills] = useState<CreditBillDTO[]>([]);
  const [billsSearch, setBillsSearch] = useState<string>("");
  const [loadingBills, setLoadingBills] = useState<boolean>(false);

  // Payments Data
  const [payments, setPayments] = useState<CreditPaymentDTO[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false);

  // Menu & Catalog for POS Credit Purchase
  const [menuItems, setMenuItems] = useState<ServiceItemDTO[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDTO[]>([]);
  const [menuSearch, setMenuSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // New Credit Purchase Form State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDTO | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [customerResults, setCustomerResults] = useState<CustomerDTO[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState<boolean>(false);
  const [orderTray, setOrderTray] = useState<TrayItem[]>([]);
  const [purchaseDiscount, setPurchaseDiscount] = useState<string>("0");
  const [purchaseNotes, setPurchaseNotes] = useState<string>("");
  const [purchaseDueDate, setPurchaseDueDate] = useState<string>("");
  const [submittingPurchase, setSubmittingPurchase] = useState<boolean>(false);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Quick Inline Custom Item Modal
  const [customItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");
  const [customItemCategory, setCustomItemCategory] = useState("Food");

  // Quick Inline New Customer Modal
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Interactive Modal States
  const [paymentModalAccount, setPaymentModalAccount] = useState<CreditAccountDTO | null>(null);
  const [paymentModalTargetBill, setPaymentModalTargetBill] = useState<CreditBillDTO | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [receiptModalPayment, setReceiptModalPayment] = useState<CreditPaymentDTO | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [ledgerModalAccount, setLedgerModalAccount] = useState<CreditAccountDTO | null>(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  const [editBillModalBill, setEditBillModalBill] = useState<CreditBillDTO | null>(null);
  const [editBillModalOpen, setEditBillModalOpen] = useState(false);

  // Fetch Current User
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch Dashboard Metrics
  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetch("/api/credits/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const params = new URLSearchParams();
      if (accountSearch.trim()) params.set("q", accountSearch.trim());
      if (accountStatusFilter !== "ALL") params.set("status", accountStatusFilter);

      const res = await fetch(`/api/credits/accounts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setAccountsTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [accountSearch, accountStatusFilter]);

  // Fetch Bills (Pending and Paid)
  const fetchBills = useCallback(async () => {
    try {
      setLoadingBills(true);
      const [pendingRes, paidRes] = await Promise.all([
        fetch(`/api/credits/bills?status=PENDING&q=${encodeURIComponent(billsSearch)}`),
        fetch(`/api/credits/bills?status=PAID&q=${encodeURIComponent(billsSearch)}`),
      ]);

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingBills(pendingData.bills || []);
      }
      if (paidRes.ok) {
        const paidData = await paidRes.json();
        setPaidBills(paidData.bills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBills(false);
    }
  }, [billsSearch]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const res = await fetch("/api/credits/payments?take=50");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Fetch Menu Items & Categories for POS
  const fetchMenuCatalog = useCallback(async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch("/api/service-items"),
        fetch("/api/menu-categories"),
      ]);

      if (menuRes.ok) {
        const items = await menuRes.json();
        setMenuItems(Array.isArray(items) ? items.filter((i) => i.isActive) : []);
      }
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchAccounts();
    fetchBills();
    fetchPayments();
    fetchMenuCatalog();
  }, [fetchDashboard, fetchAccounts, fetchBills, fetchPayments, fetchMenuCatalog]);

  // Customer Autocomplete Search
  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.length < 2) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(customerSearchQuery.trim())}&take=6`
        );
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.customers || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Handle adding item to POS tray
  const handleAddToTray = (item: ServiceItemDTO) => {
    setPurchaseSuccessMessage(null);
    setPurchaseError(null);
    const existingIndex = orderTray.findIndex(
      (t) => t.serviceItemId === item.id && !t.isCustom
    );

    if (existingIndex >= 0) {
      const updated = [...orderTray];
      updated[existingIndex].quantity += 1;
      setOrderTray(updated);
    } else {
      setOrderTray([
        ...orderTray,
        {
          serviceItemId: item.id,
          name: item.name,
          category: item.categoryName || item.category,
          quantity: 1,
          unitPrice: item.defaultPrice,
          originalPrice: item.defaultPrice,
          isCustom: false,
        },
      ]);
    }
  };

  // Tray helpers
  const updateTrayQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...orderTray];
    updated[index].quantity = newQty;
    setOrderTray(updated);
  };

  const updateTrayPrice = (index: number, newPrice: number) => {
    if (newPrice < 0 || isNaN(newPrice)) return;
    const updated = [...orderTray];
    updated[index].unitPrice = newPrice;
    setOrderTray(updated);
  };

  const removeFromTray = (index: number) => {
    setOrderTray(orderTray.filter((_, i) => i !== index));
  };

  // Add Custom Item to Tray
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const price = parseFloat(customItemPrice) || 0;
    const qty = parseInt(customItemQty) || 1;

    setOrderTray([
      ...orderTray,
      {
        name: customItemName.trim(),
        category: customItemCategory,
        quantity: qty,
        unitPrice: price,
        isCustom: true,
      },
    ]);

    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
    setCustomItemModalOpen(false);
  };

  // Inline Create New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;

    try {
      setCreatingCustomer(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newCustomerName.trim(),
          contactNumber: newCustomerPhone.trim(),
          address: newCustomerAddress.trim() || null,
          gender: "PREFER_NOT_TO_SAY",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setSelectedCustomer(data.customer);
      setCustomerSearchQuery(data.customer.fullName);
      setCustomerResults([]);
      setNewCustomerModalOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
    } catch (err: any) {
      setPurchaseError(err.message || "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Calculate POS Totals
  const traySubtotal = Math.round(
    orderTray.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;
  const numDiscount = Math.max(0, parseFloat(purchaseDiscount) || 0);
  const trayTotalCharge = Math.max(0, Math.round((traySubtotal - numDiscount) * 100) / 100);

  // Check selected customer account balance if exists
  const selectedCustomerAccount = accounts.find(
    (a) => a.customerId === selectedCustomer?.id
  );
  const previousCustomerBalance = selectedCustomerAccount?.currentBalance || 0;
  const resultingCustomerBalance = Math.round((previousCustomerBalance + trayTotalCharge) * 100) / 100;

  // Submit New Credit Purchase
  const handleSubmitCreditPurchase = async () => {
    if (!selectedCustomer) {
      setPurchaseError("Please search and select a customer first.");
      return;
    }
    if (orderTray.length === 0) {
      setPurchaseError("Please add at least one item from the menu or a custom item.");
      return;
    }

    try {
      setSubmittingPurchase(true);
      setPurchaseError(null);
      setPurchaseSuccessMessage(null);

      const res = await fetch("/api/credits/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          items: orderTray,
          discount: numDiscount,
          dueDate: purchaseDueDate || null,
          notes: purchaseNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create credit purchase");

      setPurchaseSuccessMessage(
        `Credit bill #${data.bill.billNumber} successfully recorded for ${selectedCustomer.fullName} (Rs. ${trayTotalCharge.toLocaleString()}). New Outstanding Debt: Rs. ${data.account.currentBalance.toLocaleString()}`
      );

      // Reset tray
      setOrderTray([]);
      setPurchaseDiscount("0");
      setPurchaseNotes("");
      setPurchaseDueDate("");

      // Refresh all views
      fetchDashboard();
      fetchAccounts();
      fetchBills();
    } catch (err: any) {
      setPurchaseError(err.message || "Error submitting credit purchase");
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // Filter Menu Items for POS
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch =
      !menuSearch.trim() ||
      item.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" ||
      (item.categoryName && item.categoryName === selectedCategory) ||
      item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Top Page Header */}
      <div className="p-4 sm:p-6 border-b bg-card shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Customer Credit Management
                </h1>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                >
                  Enterprise Ledger
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer-wise credit accounts, restaurant POS credit orders, installment collection & audit ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchDashboard();
                fetchAccounts();
                fetchBills();
                fetchPayments();
              }}
              className="text-xs gap-1.5 h-9"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 h-9 shadow-md"
              onClick={() => setActiveTab("new-purchase")}
            >
              <Plus className="w-4 h-4" />
              New Credit Purchase
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 sm:px-6 pt-3 border-b bg-muted/30 shrink-0 overflow-x-auto">
          <TabsList className="bg-transparent h-10 p-0 gap-1 sm:gap-2">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              Customer Accounts ({accounts.length})
            </TabsTrigger>
            <TabsTrigger
              value="new-purchase"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5 text-amber-600 dark:text-amber-400 font-bold"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              Add Credit (POS)
            </TabsTrigger>
            <TabsTrigger
              value="pending-bills"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              Pending Bills ({pendingBills.length})
            </TabsTrigger>
            <TabsTrigger
              value="paid-bills"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Paid Bills ({paidBills.length})
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3.5 text-xs font-semibold gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-500" />
              Payment Records
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =========================================================================
            TAB 1: CREDIT DASHBOARD
        ========================================================================= */}
        <TabsContent value="dashboard" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 m-0">
          {/* Top 4 Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Outstanding Credit
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-rose-500">
                  Rs. {(dashboardMetrics?.totalOutstandingCredit || 0).toLocaleString()}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Active debt owed to hotel
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payments Collected Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  Rs. {(dashboardMetrics?.paymentsCollectedToday || 0).toLocaleString()}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cash collected against credit today
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Collected This Month
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
                  Rs. {(dashboardMetrics?.paymentsCollectedThisMonth || 0).toLocaleString()}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Total credit debt settled this month
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Credit Customers
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                  {dashboardMetrics?.totalAccountsCount || 0}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {dashboardMetrics?.pendingPurchasesCount || 0} pending •{" "}
                  {dashboardMetrics?.fullyPaidPurchasesCount || 0} paid bills
                </p>
              </div>
            </div>
          </div>

          {/* Top Debtors Section */}
          <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Highest Outstanding Accounts
                </h3>
                <p className="text-xs text-muted-foreground">
                  Top customers requiring payment collection
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("accounts")}
                className="text-xs gap-1.5"
              >
                View All Accounts
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {dashboardMetrics?.topDebtors && dashboardMetrics.topDebtors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardMetrics.topDebtors.map((debtor) => {
                  const matchingAccount = accounts.find((a) => a.id === debtor.id);
                  return (
                    <div
                      key={debtor.id}
                      className="p-4 rounded-xl bg-muted/40 border hover:border-amber-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            {debtor.customerName}
                          </span>
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px]">
                            {debtor.pendingBillsCount} Unpaid
                          </Badge>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground block mt-0.5">
                          {debtor.contactNumber}
                        </span>
                        <div className="mt-3">
                          <span className="text-[11px] text-muted-foreground block">
                            Outstanding Balance
                          </span>
                          <span className="text-xl font-mono font-black text-rose-500">
                            Rs. {debtor.currentBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5"
                          onClick={() => {
                            if (matchingAccount) {
                              setPaymentModalAccount(matchingAccount);
                              setPaymentModalTargetBill(null);
                              setPaymentModalOpen(true);
                            }
                          }}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Collect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => {
                            if (matchingAccount) {
                              setLedgerModalAccount(matchingAccount);
                              setLedgerModalOpen(true);
                            }
                          }}
                        >
                          Ledger
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No active outstanding credit accounts. All customer balances settled!
              </div>
            )}
          </div>

          {/* Recent Activity: Purchases and Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Purchases */}
            <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Recent Credit Purchases
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("pending-bills")}
                  className="text-xs h-7"
                >
                  View All
                </Button>
              </div>

              <div className="divide-y text-xs">
                {dashboardMetrics?.recentPurchases && dashboardMetrics.recentPurchases.length > 0 ? (
                  dashboardMetrics.recentPurchases.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground block">
                          {b.customer?.fullName}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          #{b.billNumber} • {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm block">
                          Rs. {b.totalAmount.toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            b.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground">No recent purchases.</p>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Recent Payment Collections
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("payments")}
                  className="text-xs h-7"
                >
                  View All
                </Button>
              </div>

              <div className="divide-y text-xs">
                {dashboardMetrics?.recentPayments && dashboardMetrics.recentPayments.length > 0 ? (
                  dashboardMetrics.recentPayments.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground block">
                          {p.customer?.fullName}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {p.receiptNumber} • {p.paymentMethod}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                          + Rs. {p.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            setReceiptModalPayment(p);
                            setReceiptModalOpen(true);
                          }}
                          className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 ml-auto"
                        >
                          <Printer className="w-3 h-3" />
                          Receipt
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground">No recent payments recorded.</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: CUSTOMER CREDIT ACCOUNTS
        ========================================================================= */}
        <TabsContent value="accounts" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, phone, citizenship..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
                {(["ALL", "PENDING", "PARTIALLY_PAID", "PAID"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAccountStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                      accountStatusFilter === st
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" ? "All Accounts" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total Charged</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Unpaid Bills</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sm text-foreground block">
                            {acc.customer?.fullName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {acc.customer?.contactNumber} • {acc.customer?.address || "No address"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              acc.currentBalance <= 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {acc.currentBalance <= 0 ? "SETTLED" : "PENDING DEBT"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-muted-foreground">
                          Rs. {acc.totalCharged.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          Rs. {acc.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-base">
                          <span
                            className={
                              acc.currentBalance > 0
                                ? "text-rose-500"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            Rs. {acc.currentBalance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {acc.pendingBillsCount || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {acc.currentBalance > 0 && (
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                                onClick={() => {
                                  setPaymentModalAccount(acc);
                                  setPaymentModalTargetBill(null);
                                  setPaymentModalOpen(true);
                                }}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Collect
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => {
                                setLedgerModalAccount(acc);
                                setLedgerModalOpen(true);
                              }}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Ledger
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-amber-500 hover:text-amber-600"
                              onClick={() => {
                                setSelectedCustomer(acc.customer as any);
                                setActiveTab("new-purchase");
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Credit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        {loadingAccounts ? "Loading credit accounts..." : "No credit accounts found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 3: ADD CREDIT / NEW PURCHASE (RESTAURANT POS INTEGRATION)
        ========================================================================= */}
        <TabsContent value="new-purchase" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 m-0">
          {purchaseSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-semibold">{purchaseSuccessMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPurchaseSuccessMessage(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {purchaseError && (
            <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">{purchaseError}</span>
            </div>
          )}

          {/* STEP 1: CUSTOMER SELECTION CARD */}
          <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  1. Select Customer Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Attach this credit bill to the customer&apos;s existing permanent balance
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 h-8 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                onClick={() => setNewCustomerModalOpen(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Create New Customer
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">
                      {selectedCustomer.fullName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Customer ID: #{selectedCustomer.id.slice(-6)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground block font-mono mt-0.5">
                    Contact: {selectedCustomer.contactNumber} • Address:{" "}
                    {selectedCustomer.address || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">
                      Previous Outstanding Debt
                    </span>
                    <span className="font-mono font-black text-lg text-rose-500">
                      Rs. {previousCustomerBalance.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Type customer name, phone number, or citizenship..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-9 h-11 text-sm"
                />

                {/* Dropdown search results */}
                {customerResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-popover rounded-xl border shadow-xl z-50 divide-y overflow-hidden max-h-60 overflow-y-auto">
                    {customerResults.map((cust) => {
                      const acc = accounts.find((a) => a.customerId === cust.id);
                      return (
                        <div
                          key={cust.id}
                          className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between transition-colors"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearchQuery(cust.fullName);
                            setCustomerResults([]);
                          }}
                        >
                          <div>
                            <span className="font-bold text-sm block">{cust.fullName}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {cust.contactNumber}
                            </span>
                          </div>
                          {acc && (
                            <span className="text-xs font-mono font-bold text-rose-500">
                              Debt: Rs. {acc.currentBalance.toLocaleString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: POS MENU SELECTION & TRAY SPLIT VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Menu Items Catalog (7 Cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-card border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-amber-500" />
                    2. Select Restaurant Menu Items
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click any item to add to credit order tray
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomItemModalOpen(true)}
                  className="text-xs gap-1.5 h-8 border-dashed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Custom Dish
                </Button>
              </div>

              {/* Search & Category Pills */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search dishes, drinks, appetizers..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
                      selectedCategory === "ALL"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Dishes
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors flex items-center gap-1 ${
                        selectedCategory === cat.name
                          ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToTray(item)}
                    className="p-3 rounded-xl border bg-muted/30 hover:bg-muted/80 hover:border-amber-500/40 text-left transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <span className="font-semibold text-xs text-foreground block line-clamp-1 group-hover:text-amber-500">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block capitalize">
                        {item.categoryName || item.category}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-foreground">
                        Rs. {item.defaultPrice}
                      </span>
                      <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Order Tray & Financial Calculations (5 Cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-card border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Credit Order Tray
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {orderTray.length} line items selected
                  </p>
                </div>
                {orderTray.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-500 hover:text-rose-600"
                    onClick={() => setOrderTray([])}
                  >
                    Clear Tray
                  </Button>
                )}
              </div>

              {/* Tray Item List */}
              {orderTray.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y text-xs">
                  {orderTray.map((item, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground truncate block">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>Rate: Rs.</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateTrayPrice(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-14 h-5 px-1 font-mono text-[11px] font-bold border rounded bg-background text-right"
                          />
                        </div>
                      </div>

                      {/* Qty incrementer */}
                      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
                        <button
                          type="button"
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-background font-bold text-xs"
                          onClick={() => updateTrayQuantity(idx, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-background font-bold text-xs"
                          onClick={() => updateTrayQuantity(idx, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-xs w-16 text-right">
                        Rs. {Math.round(item.unitPrice * item.quantity).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromTray(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-4">
                  <Utensils className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2 stroke-[1.5]" />
                  Tray is empty. Select dishes from the menu on the left.
                </div>
              )}

              {/* Discount & Notes */}
              <div className="space-y-3 pt-3 border-t text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Discount (Rs.)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={purchaseDiscount}
                      onChange={(e) => setPurchaseDiscount(e.target.value)}
                      placeholder="0"
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Due Date (Optional)</Label>
                    <Input
                      type="date"
                      value={purchaseDueDate}
                      onChange={(e) => setPurchaseDueDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Purchase Notes / Remarks</Label>
                  <Input
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    placeholder="e.g. Authorized by Manager, Cabin 2 dining"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Real-Time Debt Accumulator Box */}
              <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tray Subtotal:</span>
                  <span className="font-mono">Rs. {traySubtotal.toLocaleString()}</span>
                </div>
                {numDiscount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount:</span>
                    <span className="font-mono">- Rs. {numDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t">
                  <span>This Credit Bill:</span>
                  <span className="font-mono font-black text-amber-500">
                    Rs. {trayTotalCharge.toLocaleString()}
                  </span>
                </div>
                {selectedCustomer && (
                  <div className="pt-2 border-t border-dashed space-y-1 text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Previous Debt:</span>
                      <span className="font-mono">Rs. {previousCustomerBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-500 text-xs">
                      <span>Resulting Total Debt:</span>
                      <span className="font-mono font-black">
                        Rs. {resultingCustomerBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                disabled={submittingPurchase || orderTray.length === 0 || !selectedCustomer}
                onClick={handleSubmitCreditPurchase}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-11 text-sm shadow-md gap-2"
              >
                {submittingPurchase ? (
                  "Processing Transaction..."
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Save Credit Bill (Rs. {trayTotalCharge.toLocaleString()})
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 4: PENDING BILLS
        ========================================================================= */}
        <TabsContent value="pending-bills" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bill number or customer..."
                value={billsSearch}
                onChange={(e) => setBillsSearch(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>
          </div>

          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Bill Total</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingBills.length > 0 ? (
                    pendingBills.map((bill) => {
                      const due = Math.max(0, bill.totalAmount - bill.paidAmount);
                      const matchingAccount = accounts.find((a) => a.id === bill.accountId);

                      return (
                        <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            #{bill.billNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-foreground block">
                              {bill.customer?.fullName}
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {bill.customer?.contactNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(bill.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold">
                            Rs. {bill.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {bill.paidAmount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-rose-500">
                            Rs. {due.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                bill.paidAmount > 0
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              }`}
                            >
                              {bill.paidAmount > 0 ? "PARTIALLY PAID" : "PENDING"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                                onClick={() => {
                                  if (matchingAccount) {
                                    setPaymentModalAccount(matchingAccount);
                                    setPaymentModalTargetBill(bill);
                                    setPaymentModalOpen(true);
                                  }
                                }}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Pay
                              </Button>
                              {(user?.role === "OWNER" || user?.role === "MANAGER") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => {
                                    setEditBillModalBill(bill);
                                    setEditBillModalOpen(true);
                                  }}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit Bill
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        {loadingBills ? "Loading pending bills..." : "No pending bills found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 5: PAID BILLS
        ========================================================================= */}
        <TabsContent value="paid-bills" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Total Settled</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paidBills.length > 0 ? (
                    paidBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          #{bill.billNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground block">
                            {bill.customer?.fullName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {bill.customer?.contactNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {bill.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            PAID IN FULL
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No fully settled bills in archive.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 6: PAYMENT RECORDS
        ========================================================================= */}
        <TabsContent value="payments" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {payments.length > 0 ? (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-foreground">
                          {p.customer?.fullName || "Customer"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-sans">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans uppercase font-bold text-[11px]">
                          {p.paymentMethod.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          + Rs. {p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          Rs. {p.remainingBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setReceiptModalPayment(p);
                              setReceiptModalOpen(true);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            View Receipt
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-sans">
                        {loadingPayments ? "Loading payment records..." : "No payments recorded yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODALS INTEGRATION
      ========================================================================= */}

      {/* 1. Collect Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        account={paymentModalAccount}
        targetBill={paymentModalTargetBill}
        onPaymentSuccess={(newPayment) => {
          fetchDashboard();
          fetchAccounts();
          fetchBills();
          fetchPayments();
          setReceiptModalPayment(newPayment);
          setReceiptModalOpen(true);
        }}
      />

      {/* 2. Printable Payment Receipt Modal */}
      <CreditReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        payment={receiptModalPayment}
      />

      {/* 3. Customer Ledger Modal */}
      <CustomerLedgerModal
        isOpen={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        account={ledgerModalAccount}
      />

      {/* 4. Edit Saved Bill Modal */}
      <EditBillModal
        isOpen={editBillModalOpen}
        onClose={() => setEditBillModalOpen(false)}
        bill={editBillModalBill}
        onSuccess={() => {
          fetchDashboard();
          fetchAccounts();
          fetchBills();
        }}
      />

      {/* 5. Quick Add Custom Item Modal */}
      <Dialog open={customItemModalOpen} onOpenChange={setCustomItemModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Custom Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Item Name *</Label>
              <Input
                placeholder="e.g. Special Grilled Fish"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Price (Rs.) *</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={customItemQty}
                  onChange={(e) => setCustomItemQty(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category Tag</Label>
              <Input
                placeholder="Food / Drinks / Special"
                value={customItemCategory}
                onChange={(e) => setCustomItemCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCustomItemModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              onClick={handleAddCustomItem}
            >
              Add to Tray
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Quick Add New Customer Modal */}
      <Dialog open={newCustomerModalOpen} onOpenChange={setNewCustomerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                placeholder="Customer full name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone Number *</Label>
              <Input
                placeholder="e.g. 9841234567"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address (Optional)</Label>
              <Input
                placeholder="City, District"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewCustomerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {creatingCustomer ? "Creating..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
