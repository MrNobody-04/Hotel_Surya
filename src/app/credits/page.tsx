"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  Banknote,
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
  ChevronLeft,
  Sparkles,
  Utensils,
  Trash2,
  Tag,
  Phone,
  MapPin,
  ShieldAlert,
  X,
  Minus,
  Wallet,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
  CreditLedgerEntryDTO,
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
  const [viewMode, setViewMode] = useState<"desk" | "summary">("desk");
  const [user, setUser] = useState<SessionUser | null>(null);

  // Accounts List State
  const [accounts, setAccounts] = useState<CreditAccountDTO[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<"ALL" | "DEBT" | "SETTLED">("ALL");

  // Selected Customer / Account State
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<CreditAccountDTO | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // POS Tray State for Selected Customer
  const [orderTray, setOrderTray] = useState<TrayItem[]>([]);
  const [purchaseDiscount, setPurchaseDiscount] = useState<string>("0");
  const [purchaseNotes, setPurchaseNotes] = useState<string>("");
  const [purchaseDueDate, setPurchaseDueDate] = useState<string>("");
  const [submittingPurchase, setSubmittingPurchase] = useState<boolean>(false);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Billing Target Mode: "NEW_BILL" vs "EXISTING_BILL"
  const [billingTargetMode, setBillingTargetMode] = useState<"NEW_BILL" | "EXISTING_BILL">("NEW_BILL");
  const [targetExistingBillId, setTargetExistingBillId] = useState<string>("");

  // Menu catalog state (Restaurant & Cabin Menu)
  const [menuItems, setMenuItems] = useState<ServiceItemDTO[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDTO[]>([]);
  const [menuSearch, setMenuSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Customer History Tab State
  const [historyTab, setHistoryTab] = useState<"bills" | "payments" | "ledger">("bills");

  // Dashboard / All Bills Summary Data
  const [dashboardMetrics, setDashboardMetrics] = useState<CreditDashboardMetricsDTO | null>(null);
  const [pendingBills, setPendingBills] = useState<CreditBillDTO[]>([]);
  const [paidBills, setPaidBills] = useState<CreditBillDTO[]>([]);
  const [allPayments, setAllPayments] = useState<CreditPaymentDTO[]>([]);
  const [summarySearch, setSummarySearch] = useState<string>("");

  // Modals State
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>("");
  const [newCustomerAddress, setNewCustomerAddress] = useState<string>("");
  const [creatingCustomer, setCreatingCustomer] = useState<boolean>(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  // Delete Customer State
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Custom Item Modal State
  const [customItemModalOpen, setCustomItemModalOpen] = useState<boolean>(false);
  const [customItemName, setCustomItemName] = useState<string>("");
  const [customItemPrice, setCustomItemPrice] = useState<string>("");
  const [customItemQty, setCustomItemQty] = useState<string>("1");
  const [customItemCategory, setCustomItemCategory] = useState<string>("Food");

  // Record Payment Modal State
  const [paymentModalAccount, setPaymentModalAccount] = useState<CreditAccountDTO | null>(null);
  const [paymentModalTargetBill, setPaymentModalTargetBill] = useState<CreditBillDTO | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);

  // Receipt Modal State
  const [receiptModalPayment, setReceiptModalPayment] = useState<CreditPaymentDTO | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);

  // Ledger Modal State
  const [ledgerModalAccount, setLedgerModalAccount] = useState<CreditAccountDTO | null>(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState<boolean>(false);

  // Edit Bill Modal State
  const [editBillModalBill, setEditBillModalBill] = useState<CreditBillDTO | null>(null);
  const [editBillModalOpen, setEditBillModalOpen] = useState<boolean>(false);

  // Mobile detail view toggle
  const [showMobileWorkspace, setShowMobileWorkspace] = useState<boolean>(false);

  // Fetch Current User
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch Credit Accounts (Only credit customers)
  const fetchAccounts = useCallback(async (selectTargetCustomerId?: string) => {
    try {
      setLoadingAccounts(true);
      const res = await fetch("/api/credits/accounts?take=100");
      if (res.ok) {
        const data = await res.json();
        const accs: CreditAccountDTO[] = data.accounts || [];
        setAccounts(accs);

        if (selectTargetCustomerId) {
          const match = accs.find((a) => a.customerId === selectTargetCustomerId);
          if (match) {
            setSelectedAccountId(match.id);
            setShowMobileWorkspace(true);
          }
        } else if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        } else if (accs.length === 0) {
          setSelectedAccountId(null);
          setSelectedAccountDetails(null);
        }
      }
    } catch (err) {
      console.error("Error fetching credit accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedAccountId]);

  // Fetch Details of Selected Account
  const fetchAccountDetails = useCallback(async (accountId: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/credits/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAccountDetails(data.account || null);
      }
    } catch (err) {
      console.error("Error fetching account details:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Fetch Menu Items & Categories from Restaurant and Cabin Catalog
  const fetchMenuCatalog = useCallback(async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch("/api/service-items"),
        fetch("/api/menu-categories"),
      ]);

      if (menuRes.ok) {
        const data = await menuRes.json();
        const rawItems = Array.isArray(data) ? data : data.items || [];
        setMenuItems(rawItems.filter((i: ServiceItemDTO) => i.isActive));
      }
      if (catRes.ok) {
        const data = await catRes.json();
        const rawCats = Array.isArray(data) ? data : data.categories || [];
        setCategories(rawCats);
      }
    } catch (err) {
      console.error("Error fetching menu catalog:", err);
    }
  }, []);

  // Fetch Dashboard & Summary Data
  const fetchSummaryData = useCallback(async () => {
    try {
      const [dashRes, pendRes, paidRes, payRes] = await Promise.all([
        fetch("/api/credits/dashboard"),
        fetch("/api/credits/bills?status=PENDING&take=100"),
        fetch("/api/credits/bills?status=PAID&take=100"),
        fetch("/api/credits/payments?take=100"),
      ]);

      if (dashRes.ok) setDashboardMetrics(await dashRes.json());
      if (pendRes.ok) {
        const data = await pendRes.json();
        setPendingBills(data.bills || []);
      }
      if (paidRes.ok) {
        const data = await paidRes.json();
        setPaidBills(data.bills || []);
      }
      if (payRes.ok) {
        const data = await payRes.json();
        setAllPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Error fetching summary data:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAccounts();
    fetchMenuCatalog();
    fetchSummaryData();
  }, [fetchAccounts, fetchMenuCatalog, fetchSummaryData]);

  // When selected account changes, load details & reset tray
  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountDetails(selectedAccountId);
      setOrderTray([]);
      setPurchaseDiscount("0");
      setPurchaseNotes("");
      setPurchaseDueDate("");
      setPurchaseError(null);
      setPurchaseSuccessMessage(null);
    } else {
      setSelectedAccountDetails(null);
    }
  }, [selectedAccountId, fetchAccountDetails]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const name = acc.customer?.fullName?.toLowerCase() || "";
      const phone = acc.customer?.contactNumber || "";
      const query = accountSearch.toLowerCase().trim();

      const matchesQuery = !query || name.includes(query) || phone.includes(query);

      if (!matchesQuery) return false;

      if (accountFilter === "DEBT") {
        return acc.currentBalance > 0.01;
      }
      if (accountFilter === "SETTLED") {
        return acc.currentBalance <= 0.01;
      }
      return true;
    });
  }, [accounts, accountSearch, accountFilter]);

  // Filtered Restaurant & Cabin Menu Items for Quick Adding
  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.toLowerCase().trim();
    return menuItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      const itemCategory = (item.categoryName || item.category || "").toLowerCase();
      const matchesCategory =
        selectedCategory === "ALL" ||
        itemCategory === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, menuSearch, selectedCategory]);

  // Tray helpers
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

  // Filter pending / unpaid bills for selected customer to allow adding to existing bills
  const unpaidBills = useMemo(() => {
    return (selectedAccountDetails?.bills || []).filter(
      (b) => b.status !== "PAID" && b.status !== "CANCELLED"
    );
  }, [selectedAccountDetails]);

  // Tray calculations
  const traySubtotal = useMemo(() => {
    return (
      Math.round(
        orderTray.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
      ) / 100
    );
  }, [orderTray]);

  const numDiscount = Math.max(0, parseFloat(purchaseDiscount) || 0);
  const trayTotal = Math.max(0, Math.round((traySubtotal - numDiscount) * 100) / 100);

  // Submit Credit Purchase for Selected Customer
  const handleSubmitCreditBill = async () => {
    if (!selectedAccountDetails?.customerId) {
      setPurchaseError("Please select a customer first.");
      return;
    }
    if (orderTray.length === 0) {
      setPurchaseError("Please add at least one item from the menu to the credit bill.");
      return;
    }

    try {
      setSubmittingPurchase(true);
      setPurchaseError(null);
      setPurchaseSuccessMessage(null);

      if (billingTargetMode === "EXISTING_BILL") {
        if (!targetExistingBillId) {
          setPurchaseError("Please select an existing bill to add items to.");
          return;
        }

        const res = await fetch(`/api/credits/bills/${targetExistingBillId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: orderTray,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add items to credit bill");

        const targetBillObj = unpaidBills.find((b) => b.id === targetExistingBillId);
        const billNum = targetBillObj?.billNumber || data.bill?.billNumber || "";

        setPurchaseSuccessMessage(
          `Successfully added ${orderTray.length} item(s) (Rs. ${trayTotal.toLocaleString()}) directly to Bill #${billNum} for ${selectedAccountDetails.customer?.fullName}!`
        );
        toast.success(`Items added to Bill #${billNum}`);
      } else {
        const res = await fetch("/api/credits/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: selectedAccountDetails.customerId,
            items: orderTray,
            discount: numDiscount,
            dueDate: purchaseDueDate || null,
            notes: purchaseNotes.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create credit bill");

        setPurchaseSuccessMessage(
          `New credit bill #${data.bill.billNumber} (Rs. ${trayTotal.toLocaleString()}) saved successfully to ${selectedAccountDetails.customer?.fullName}!`
        );
        toast.success(`New credit bill #${data.bill.billNumber} created`);
      }

      // Reset tray
      setOrderTray([]);
      setPurchaseDiscount("0");
      setPurchaseNotes("");
      setPurchaseDueDate("");

      // Refresh account details and accounts list
      await fetchAccountDetails(selectedAccountDetails.id);
      await fetchAccounts();
      fetchSummaryData();
    } catch (err: any) {
      setPurchaseError(err.message || "Error submitting credit purchase");
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // Create New Customer (Name Compulsory, Phone Optional) -> Creates Credit Account Immediately
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      setNewCustomerError("Full Name is compulsory.");
      return;
    }

    try {
      setCreatingCustomer(true);
      setNewCustomerError(null);

      const res = await fetch("/api/credits/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            fullName: newCustomerName.trim(),
            contactNumber: newCustomerPhone.trim() || "N/A",
            address: newCustomerAddress.trim() || null,
            gender: "PREFER_NOT_TO_SAY",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      // Reset form & close modal
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerModalOpen(false);

      // Select newly created credit account immediately
      if (data.account?.id) {
        setSelectedAccountId(data.account.id);
        setShowMobileWorkspace(true);
        await fetchAccounts(data.account.customerId);
        await fetchAccountDetails(data.account.id);
      } else {
        await fetchAccounts();
      }
    } catch (err: any) {
      setNewCustomerError(err.message || "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Delete Customer Handler
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      setDeletingCustomer(true);
      setDeleteError(null);

      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete customer");

      // If deleted customer was currently selected, clear selection
      if (selectedAccountDetails?.customerId === customerToDelete.id) {
        setSelectedAccountId(null);
        setSelectedAccountDetails(null);
        setShowMobileWorkspace(false);
      }

      setCustomerToDelete(null);
      await fetchAccounts();
      fetchSummaryData();
    } catch (err: any) {
      setDeleteError(err.message || "Error deleting customer");
    } finally {
      setDeletingCustomer(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      {/* =========================================================================
          TOP PAGE HEADER
      ========================================================================= */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b bg-card shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Credit Management
                </h1>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-[11px]"
                >
                  Customer Desk
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage credit customers, bill directly from restaurant & cabin menu, collect payments & track history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("desk")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "desk"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Customer Credit Desk
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("summary");
                  fetchSummaryData();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "summary"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                All Bills & Analytics
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAccounts();
                if (selectedAccountId) fetchAccountDetails(selectedAccountId);
                fetchSummaryData();
                fetchMenuCatalog();
              }}
              className="text-xs gap-1.5 h-8 sm:h-9"
              title="Refresh records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 h-8 sm:h-9 shadow-sm"
              onClick={() => {
                setNewCustomerError(null);
                setNewCustomerName("");
                setNewCustomerPhone("");
                setNewCustomerAddress("");
                setNewCustomerModalOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4" />
              + New Customer
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE
      ========================================================================= */}
      {viewMode === "desk" ? (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* =====================================================================
              LEFT PANE: CUSTOMER DIRECTORY (Master List)
          ===================================================================== */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col border-r bg-card/60 shrink-0 ${
              showMobileWorkspace ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search & New Customer Action */}
            <div className="p-3 sm:p-4 border-b space-y-2.5 bg-card">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customer by name or phone..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="pl-9 pr-8 text-xs h-9 bg-background"
                />
                {accountSearch && (
                  <button
                    onClick={() => setAccountSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAccountFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    accountFilter === "ALL"
                      ? "bg-foreground text-background"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({accounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAccountFilter("DEBT")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    accountFilter === "DEBT"
                      ? "bg-rose-500 text-white"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                  }`}
                >
                  With Due ({accounts.filter((a) => a.currentBalance > 0.01).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAccountFilter("SETTLED")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    accountFilter === "SETTLED"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  Settled ({accounts.filter((a) => a.currentBalance <= 0.01).length})
                </button>
              </div>
            </div>

            {/* Scrollable Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loadingAccounts ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading credit customers...
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <div>
                    <p className="text-xs font-bold text-foreground">No credit customers yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Create your first credit customer (e.g. Ravi) to start billing
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewCustomerError(null);
                      setNewCustomerModalOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 h-8"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add New Customer
                  </Button>
                </div>
              ) : (
                filteredAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  const hasDebt = account.currentBalance > 0.01;
                  const customerName = account.customer?.fullName || "Customer";
                  const contact = account.customer?.contactNumber;
                  const hasPhone = contact && contact !== "N/A";

                  return (
                    <div
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setShowMobileWorkspace(true);
                      }}
                      className={`p-3 sm:p-3.5 cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? "bg-amber-500/10 border-l-4 border-amber-500 font-medium"
                          : "hover:bg-muted/50 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            hasDebt
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-muted text-muted-foreground border"
                          }`}
                        >
                          {customerName.charAt(0).toUpperCase()}
                        </div>

                        {/* Customer Info */}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate block">
                            {customerName}
                          </span>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {hasPhone ? (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-muted-foreground/70" />
                                {contact}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">No phone</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Balance Badge & Quick Delete */}
                      <div className="flex items-center gap-2 pl-2 shrink-0">
                        <div className="text-right">
                          {hasDebt ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-mono font-bold"
                            >
                              Rs. {account.currentBalance.toLocaleString()} Due
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold"
                            >
                              Settled
                            </Badge>
                          )}
                        </div>

                        {/* Delete Customer Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setCustomerToDelete({
                              id: account.customerId,
                              name: customerName,
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg transition-opacity"
                          title="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* =====================================================================
              RIGHT PANE: SELECTED CUSTOMER WORKSPACE (Detail View)
          ===================================================================== */}
          <div
            className={`flex-1 flex flex-col min-w-0 bg-background overflow-y-auto ${
              !showMobileWorkspace ? "hidden md:flex" : "flex"
            }`}
          >
            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                Loading customer profile...
              </div>
            ) : !selectedAccountDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Select or Create a Customer
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Pick a customer from the left list or create a new customer to add items from the restaurant & cabin menu, collect payments, or view history.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewCustomerError(null);
                    setNewCustomerModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 text-xs shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  + Create New Customer
                </Button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6">
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center justify-between pb-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileWorkspace(false)}
                    className="text-xs gap-1.5 h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Customer List
                  </Button>
                </div>

                {/* =================================================================
                    CUSTOMER HEADER & 3-CARD STATS RIBBON (DUE, PAID, REMAINING)
                ================================================================= */}
                <div className="p-4 sm:p-5 rounded-2xl bg-card border shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                          {selectedAccountDetails.customer?.fullName}
                        </h2>
                        {selectedAccountDetails.currentBalance > 0.01 ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold"
                          >
                            Active Due
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold"
                          >
                            All Settled
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {selectedAccountDetails.customer?.contactNumber &&
                        selectedAccountDetails.customer.contactNumber !== "N/A" ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                            {selectedAccountDetails.customer.contactNumber}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">No contact number</span>
                        )}

                        {selectedAccountDetails.customer?.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                            {selectedAccountDetails.customer.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Quick Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => {
                          setBillingTargetMode("NEW_BILL");
                          const el = document.getElementById("order-menu-section");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 h-9 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        + New Bill
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentModalAccount(selectedAccountDetails);
                          setPaymentModalTargetBill(null);
                          setPaymentModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 shadow-sm"
                        disabled={selectedAccountDetails.currentBalance <= 0.01}
                      >
                        <Wallet className="w-4 h-4" />
                        Collect Payment
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLedgerModalAccount(selectedAccountDetails);
                          setLedgerModalOpen(true);
                        }}
                        className="text-xs gap-1.5 h-9"
                      >
                        <BookOpen className="w-4 h-4" />
                        Ledger
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setCustomerToDelete({
                            id: selectedAccountDetails.customerId,
                            name: selectedAccountDetails.customer?.fullName || "Customer",
                          });
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 h-9"
                        title="Delete customer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* 3 Prominent Stat Blocks: DUE, PAID, REMAINING */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                    {/* Stat 1: Total Due / Charged */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Total Due / Billed
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1 block">
                        Rs. {(selectedAccountDetails.totalCharged || 0).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Total credit orders to date
                      </p>
                    </div>

                    {/* Stat 2: Paid Amount */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Paid Amount
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                        Rs. {(selectedAccountDetails.totalPaid || 0).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Cash & online payments collected
                      </p>
                    </div>

                    {/* Stat 3: Remaining Amount */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        selectedAccountDetails.currentBalance > 0.01
                          ? "bg-rose-500/5 border-rose-500/30"
                          : "bg-muted/40"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider block ${
                          selectedAccountDetails.currentBalance > 0.01
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        Remaining Due
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-black font-mono mt-1 block ${
                          selectedAccountDetails.currentBalance > 0.01
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        Rs. {(selectedAccountDetails.currentBalance || 0).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {selectedAccountDetails.currentBalance > 0.01
                          ? "Active outstanding debt"
                          : "Account fully settled"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    SECTION 1: ADD ITEMS TO CREDIT BILL (Restaurant & Cabin Menu)
                ================================================================= */}
                <div id="order-menu-section" className="p-4 sm:p-5 rounded-2xl bg-card border shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-amber-500" />
                        Add Items to Credit Bill
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select from Restaurant & Cabin menu ({menuItems.length} items) or add custom items to {selectedAccountDetails.customer?.fullName}&apos;s bill
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomItemName("");
                        setCustomItemPrice("");
                        setCustomItemQty("1");
                        setCustomItemModalOpen(true);
                      }}
                      className="text-xs gap-1.5 h-8 border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Custom Item
                    </Button>
                  </div>

                  {/* Billing Target Selector: Create New Bill vs Add to Existing Bill */}
                  <div className="p-3 bg-muted/40 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">Billing Option:</span>
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border">
                        <button
                          type="button"
                          onClick={() => setBillingTargetMode("NEW_BILL")}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            billingTargetMode === "NEW_BILL"
                              ? "bg-amber-500 text-slate-950 shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          + New Credit Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (unpaidBills.length > 0) {
                              setBillingTargetMode("EXISTING_BILL");
                              if (!targetExistingBillId || !unpaidBills.some((b) => b.id === targetExistingBillId)) {
                                setTargetExistingBillId(unpaidBills[0].id);
                              }
                            } else {
                              toast.info("No unpaid bills found for this customer. Creating a new bill.");
                            }
                          }}
                          disabled={unpaidBills.length === 0}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            billingTargetMode === "EXISTING_BILL"
                              ? "bg-amber-500 text-slate-950 shadow-sm"
                              : unpaidBills.length === 0
                              ? "opacity-50 cursor-not-allowed text-muted-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Add to Existing Bill ({unpaidBills.length})
                        </button>
                      </div>
                    </div>

                    {billingTargetMode === "EXISTING_BILL" && unpaidBills.length > 0 && (
                      <div className="flex items-center gap-2 flex-1 sm:justify-end">
                        <span className="text-muted-foreground whitespace-nowrap">Target Bill:</span>
                        <Select
                          value={targetExistingBillId || (unpaidBills[0]?.id ?? "")}
                          onValueChange={(val) => setTargetExistingBillId(val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background w-full sm:w-64">
                            <SelectValue placeholder="Select pending bill" />
                          </SelectTrigger>
                          <SelectContent>
                            {unpaidBills.map((b) => {
                              const due = Math.max(0, b.totalAmount - b.paidAmount);
                              return (
                                <SelectItem key={b.id} value={b.id}>
                                  Bill #{b.billNumber} • Due: Rs. {due.toLocaleString()} (Total: Rs. {b.totalAmount.toLocaleString()})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Menu Dish Quick Search & Categories */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search menu dishes (e.g. momo, chowmein, fried rice, beer, tea)..."
                          value={menuSearch}
                          onChange={(e) => setMenuSearch(e.target.value)}
                          className="pl-8 text-xs h-9 bg-background"
                        />
                        {menuSearch && (
                          <button
                            onClick={() => setMenuSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("ALL")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === "ALL"
                            ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        All Items ({menuItems.length})
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                            selectedCategory.toLowerCase() === cat.name.toLowerCase()
                              ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    {/* Quick Dish Selection Grid */}
                    <div className="max-h-56 overflow-y-auto p-2.5 rounded-xl bg-muted/20 border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {filteredMenuItems.length === 0 ? (
                        <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                          No menu items matching &quot;{menuSearch}&quot;. You can use &quot;+ Custom Item&quot; to add anything off-menu.
                        </div>
                      ) : (
                        filteredMenuItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddToTray(item)}
                            className="p-2.5 rounded-xl bg-card border hover:border-amber-500/50 hover:bg-amber-500/5 text-left transition-all flex flex-col justify-between shadow-2xs group cursor-pointer active:scale-98"
                          >
                            <span className="font-bold text-xs text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1">
                              {item.name}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span className="text-muted-foreground text-[10px] truncate max-w-[80px]">
                                {item.categoryName || item.category || "Menu"}
                              </span>
                              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                Rs. {item.defaultPrice}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Current Bill Items Tray */}
                  <div className="border rounded-xl bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between text-xs font-bold">
                      <span>Items in Current Bill ({orderTray.length})</span>
                      {orderTray.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setOrderTray([])}
                          className="text-rose-500 hover:underline font-normal text-[11px]"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {orderTray.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No dishes selected yet. Click any dish from the menu above or use &quot;+ Custom Item&quot; to add to this bill.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {orderTray.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-muted/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground truncate">
                                  {item.name}
                                </span>
                                {item.isCustom && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 py-0 px-1">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {item.category || "Food"}
                              </span>
                            </div>

                            {/* Qty & Price Controls */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {/* Quantity Stepper */}
                              <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                                <button
                                  type="button"
                                  onClick={() => updateTrayQuantity(idx, item.quantity - 1)}
                                  className="p-1 hover:bg-muted text-muted-foreground"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center font-bold font-mono">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateTrayQuantity(idx, item.quantity + 1)}
                                  className="p-1 hover:bg-muted text-muted-foreground"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Editable Price */}
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-muted-foreground">@ Rs.</span>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updateTrayPrice(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 h-7 text-xs font-mono font-bold px-1.5 py-0"
                                  title="Edit unit price if discounted"
                                />
                              </div>

                              {/* Line Total */}
                              <span className="font-mono font-bold text-foreground w-20 text-right">
                                Rs. {(item.quantity * item.unitPrice).toLocaleString()}
                              </span>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => removeFromTray(idx)}
                                className="p-1 text-muted-foreground hover:text-rose-500"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tray Summary & Submission */}
                    {orderTray.length > 0 && (
                      <div className="p-4 bg-muted/30 border-t space-y-3">
                        {billingTargetMode === "NEW_BILL" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Discount (Rs.)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={purchaseDiscount}
                                onChange={(e) => setPurchaseDiscount(e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs font-mono mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Due Date (Optional)
                              </Label>
                              <Input
                                type="date"
                                value={purchaseDueDate}
                                onChange={(e) => setPurchaseDueDate(e.target.value)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Bill Note (Optional)
                              </Label>
                              <Input
                                value={purchaseNotes}
                                onChange={(e) => setPurchaseNotes(e.target.value)}
                                placeholder="e.g. Dinner with friends"
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-amber-700 dark:text-amber-300 block">
                                Appending Items to Existing Credit Bill
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Adding to:{" "}
                                <strong className="font-mono text-foreground">
                                  #{unpaidBills.find((b) => b.id === targetExistingBillId)?.billNumber || "Selected Bill"}
                                </strong>
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[11px] bg-background">
                              Direct Bill Append
                            </Badge>
                          </div>
                        )}

                        {/* Error or Success Alerts */}
                        {purchaseError && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {purchaseError}
                          </div>
                        )}
                        {purchaseSuccessMessage && (
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {purchaseSuccessMessage}
                          </div>
                        )}

                        {/* Total & Submit Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                          <div>
                            <span className="text-[11px] text-muted-foreground block">
                              {billingTargetMode === "EXISTING_BILL" ? "Added Items Total" : "New Bill Total"}
                            </span>
                            <span className="text-xl font-black font-mono text-amber-500">
                              Rs. {trayTotal.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            onClick={handleSubmitCreditBill}
                            disabled={submittingPurchase || orderTray.length === 0}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 text-xs h-10 px-6 shadow-md"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {submittingPurchase
                              ? "Saving to Credit..."
                              : billingTargetMode === "EXISTING_BILL"
                              ? `Add Items to Bill #${unpaidBills.find((b) => b.id === targetExistingBillId)?.billNumber || ""} (+Rs. ${trayTotal.toLocaleString()})`
                              : `Save New Credit Bill (Rs. ${trayTotal.toLocaleString()})`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================================
                    SECTION 2: CUSTOMER HISTORY (Bills, Payments & Ledger)
                ================================================================= */}
                <div className="p-4 sm:p-5 rounded-2xl bg-card border shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      History of {selectedAccountDetails.customer?.fullName}
                    </h3>

                    {/* Sub-tab Switcher */}
                    <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setHistoryTab("bills")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          historyTab === "bills"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bills ({selectedAccountDetails.bills?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTab("payments")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          historyTab === "payments"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Payments ({selectedAccountDetails.payments?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTab("ledger")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          historyTab === "ledger"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Ledger
                      </button>
                    </div>
                  </div>

                  {/* History Sub-tab 1: Bills */}
                  {historyTab === "bills" && (
                    <div className="space-y-3">
                      {!selectedAccountDetails.bills || selectedAccountDetails.bills.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No credit bills on record for this customer yet.
                        </div>
                      ) : (
                        <div className="divide-y border rounded-xl overflow-hidden bg-card">
                          {selectedAccountDetails.bills.map((bill) => {
                            const isPaid = bill.status === "PAID";
                            const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);

                            return (
                              <div
                                key={bill.id}
                                className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-all text-xs"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-black text-xs text-foreground">
                                      #{bill.billNumber}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {new Date(bill.createdAt).toLocaleDateString()} at{" "}
                                      {new Date(bill.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-bold ${
                                        isPaid
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                          : bill.paidAmount > 0
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                      }`}
                                    >
                                      {bill.status}
                                    </Badge>
                                  </div>

                                  {/* Items Summary */}
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {bill.items && bill.items.length > 0
                                      ? bill.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")
                                      : "General Credit"}
                                  </p>

                                  {bill.notes && (
                                    <p className="text-[10px] italic text-muted-foreground">
                                      Note: {bill.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Financial Amounts & Actions */}
                                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                                  <div className="text-right">
                                    <span className="font-mono font-black text-foreground block">
                                      Rs. {bill.totalAmount.toLocaleString()}
                                    </span>
                                    {!isPaid && (
                                      <span className="text-[10px] font-mono text-rose-500 block">
                                        Rs. {remaining.toLocaleString()} due
                                      </span>
                                    )}
                                  </div>

                                  {/* Edit Bill */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditBillModalBill(bill);
                                      setEditBillModalOpen(true);
                                    }}
                                    className="h-8 text-xs gap-1"
                                    title="Edit bill items or prices"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    Edit
                                  </Button>

                                  {/* Add Items to this existing bill */}
                                  {!isPaid && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setBillingTargetMode("EXISTING_BILL");
                                        setTargetExistingBillId(bill.id);
                                        const el = document.getElementById("order-menu-section");
                                        el?.scrollIntoView({ behavior: "smooth" });
                                        toast.info(`Selected Bill #${bill.billNumber} to add items`);
                                      }}
                                      className="h-8 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/10"
                                      title="Add items to this existing bill"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Items
                                    </Button>
                                  )}

                                  {/* Pay Bill */}
                                  {!isPaid && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setPaymentModalAccount(selectedAccountDetails);
                                        setPaymentModalTargetBill(bill);
                                        setPaymentModalOpen(true);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs gap-1"
                                    >
                                      <Banknote className="w-3 h-3" />
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* History Sub-tab 2: Payments */}
                  {historyTab === "payments" && (
                    <div className="space-y-3">
                      {!selectedAccountDetails.payments || selectedAccountDetails.payments.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No payment receipts recorded for this customer yet.
                        </div>
                      ) : (
                        <div className="divide-y border rounded-xl overflow-hidden bg-card">
                          {selectedAccountDetails.payments.map((pmt) => (
                            <div
                              key={pmt.id}
                              className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-foreground">
                                    Receipt #{pmt.receiptNumber}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    {pmt.paymentMethod}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground block">
                                  {new Date(pmt.createdAt).toLocaleDateString()} at{" "}
                                  {new Date(pmt.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {pmt.notes && (
                                  <span className="text-[10px] italic text-muted-foreground block">
                                    {pmt.notes}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  Rs. {pmt.amount.toLocaleString()}
                                </span>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReceiptModalPayment(pmt);
                                    setReceiptModalOpen(true);
                                  }}
                                  className="h-8 text-xs gap-1"
                                >
                                  <Printer className="w-3 h-3" />
                                  Receipt
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* History Sub-tab 3: Ledger */}
                  {historyTab === "ledger" && (
                    <div className="space-y-3">
                      {!selectedAccountDetails.ledgerEntries || selectedAccountDetails.ledgerEntries.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No ledger transactions recorded yet.
                        </div>
                      ) : (
                        <div className="border rounded-xl overflow-hidden bg-card">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                              <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Debit (+)</th>
                                <th className="p-3 text-right">Credit (-)</th>
                                <th className="p-3 text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono">
                              {selectedAccountDetails.ledgerEntries.map((entry: CreditLedgerEntryDTO) => (
                                <tr key={entry.id} className="hover:bg-muted/20">
                                  <td className="p-3 text-muted-foreground whitespace-nowrap text-[11px]">
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-3">
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] font-bold ${
                                        entry.type === "CHARGE"
                                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                          : entry.type === "PAYMENT"
                                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      }`}
                                    >
                                      {entry.type}
                                    </Badge>
                                  </td>
                                  <td className="p-3 font-sans text-foreground">
                                    {entry.description}
                                  </td>
                                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                                    {entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString()}` : "-"}
                                  </td>
                                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                    {entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString()}` : "-"}
                                  </td>
                                  <td className="p-3 text-right font-black text-foreground">
                                    Rs. {entry.runningBalance.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: ALL BILLS & ANALYTICS SUMMARY (For Owners & Managers)
        ========================================================================= */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Outstanding Credit
              </span>
              <span className="text-2xl font-black font-mono text-rose-500 mt-2 block">
                Rs. {(dashboardMetrics?.totalOutstandingCredit || 0).toLocaleString()}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Active debt across all customers
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Payments Collected Today
              </span>
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block">
                Rs. {(dashboardMetrics?.paymentsCollectedToday || 0).toLocaleString()}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cash settled against credit today
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Collected This Month
              </span>
              <span className="text-2xl font-black font-mono text-amber-500 mt-2 block">
                Rs. {(dashboardMetrics?.paymentsCollectedThisMonth || 0).toLocaleString()}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Settled debt this calendar month
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Credit Customers
              </span>
              <span className="text-2xl font-black font-mono text-foreground mt-2 block">
                {accounts.length}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                {accounts.filter((a) => a.currentBalance > 0.01).length} with active debt
              </p>
            </div>
          </div>

          {/* Pending Bills & Paid Bills Tables */}
          <Tabs defaultValue="pending" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="pending" className="text-xs font-bold gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  All Pending Bills ({pendingBills.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs font-bold gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  All Paid Bills ({paidBills.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs font-bold gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-500" />
                  All Payments ({allPayments.length})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter bills by customer or #..."
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-card"
                />
              </div>
            </div>

            {/* Tab: Pending Bills */}
            <TabsContent value="pending" className="m-0">
              <div className="border rounded-2xl overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Bill #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Items</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-right">Remaining Due</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {pendingBills
                        .filter((b) => {
                          if (!summarySearch.trim()) return true;
                          const q = summarySearch.toLowerCase();
                          return (
                            b.billNumber.toLowerCase().includes(q) ||
                            b.customer?.fullName.toLowerCase().includes(q)
                          );
                        })
                        .map((b) => {
                          const remaining = Math.max(0, b.totalAmount - b.paidAmount);
                          return (
                            <tr key={b.id} className="hover:bg-muted/20">
                              <td className="p-3 font-mono font-bold text-foreground">
                                #{b.billNumber}
                              </td>
                              <td className="p-3 font-bold text-foreground">
                                {b.customer?.fullName}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {new Date(b.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-muted-foreground max-w-xs truncate">
                                {b.items?.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                              </td>
                              <td className="p-3 text-right font-mono font-bold">
                                Rs. {b.totalAmount.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-rose-500">
                                Rs. {remaining.toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/20">
                                  {b.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const matchingAccount = accounts.find((a) => a.id === b.accountId);
                                    if (matchingAccount) {
                                      setPaymentModalAccount(matchingAccount);
                                      setPaymentModalTargetBill(b);
                                      setPaymentModalOpen(true);
                                    }
                                  }}
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                  Collect
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Paid Bills */}
            <TabsContent value="paid" className="m-0">
              <div className="border rounded-2xl overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Bill #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Items</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paidBills
                        .filter((b) => {
                          if (!summarySearch.trim()) return true;
                          const q = summarySearch.toLowerCase();
                          return (
                            b.billNumber.toLowerCase().includes(q) ||
                            b.customer?.fullName.toLowerCase().includes(q)
                          );
                        })
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-muted/20">
                            <td className="p-3 font-mono font-bold text-foreground">
                              #{b.billNumber}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              {b.customer?.fullName}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(b.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate">
                              {b.items?.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {b.totalAmount.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                PAID
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Tab: All Payments */}
            <TabsContent value="payments" className="m-0">
              <div className="border rounded-2xl overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Receipt #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3">Note</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {allPayments
                        .filter((p) => {
                          if (!summarySearch.trim()) return true;
                          const q = summarySearch.toLowerCase();
                          return p.receiptNumber.toLowerCase().includes(q);
                        })
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="p-3 font-mono font-bold text-foreground">
                              #{p.receiptNumber}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {p.paymentMethod}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-[11px] italic">
                              {p.notes || "-"}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {p.amount.toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReceiptModalPayment(p);
                                  setReceiptModalOpen(true);
                                }}
                                className="h-7 text-[11px] gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                Receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: NEW CUSTOMER (Name Compulsory, Phone Optional)
      ========================================================================= */}
      <Dialog open={newCustomerModalOpen} onOpenChange={setNewCustomerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Create Credit Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a customer profile for credit billing. Full Name is compulsory, Phone Number is optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
            {newCustomerError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {newCustomerError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Customer Full Name <span className="text-rose-500">* (Required)</span>
              </Label>
              <Input
                autoFocus
                placeholder="e.g. Ravi"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. 9841234567 or leave blank"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Address / Location <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Tansen, Palpa"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewCustomerModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingCustomer || !newCustomerName.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
              >
                {creatingCustomer ? "Creating..." : "Create & Open Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: DELETE CUSTOMER CONFIRMATION
      ========================================================================= */}
      <Dialog
        open={Boolean(customerToDelete)}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-500">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Delete Customer Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{customerToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-muted-foreground">
            <p>
              This will permanently delete this customer profile and clean up their credit records.
            </p>
            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomerToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteCustomer}
              disabled={deletingCustomer}
              className="font-bold text-xs gap-1.5"
            >
              {deletingCustomer ? "Deleting..." : "Yes, Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: QUICK CUSTOM ITEM MODAL
      ========================================================================= */}
      <Dialog open={customItemModalOpen} onOpenChange={setCustomItemModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" />
              Add Custom Item
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add an off-menu item or special request directly to this bill
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Item Name *</Label>
              <Input
                autoFocus
                placeholder="e.g. Special Salad, Extra Fish"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Unit Price (Rs.) *</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={customItemQty}
                  onChange={(e) => setCustomItemQty(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input
                value={customItemCategory}
                onChange={(e) => setCustomItemCategory(e.target.value)}
                placeholder="Food / Drinks"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomItemModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomItem}
              disabled={!customItemName.trim() || !customItemPrice}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              Add to Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          INTERACTIVE MODALS: PAYMENT, RECEIPT, EDIT BILL, LEDGER
      ========================================================================= */}
      {/* 1. Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        account={paymentModalAccount}
        targetBill={paymentModalTargetBill}
        onPaymentSuccess={(pmt) => {
          setPaymentModalOpen(false);
          setReceiptModalPayment(pmt);
          setReceiptModalOpen(true);
          if (selectedAccountId) fetchAccountDetails(selectedAccountId);
          fetchAccounts();
          fetchSummaryData();
        }}
      />

      {/* 2. Credit Receipt Modal */}
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

      {/* 4. Edit Bill Modal */}
      <EditBillModal
        isOpen={editBillModalOpen}
        onClose={() => setEditBillModalOpen(false)}
        bill={editBillModalBill}
        onSuccess={() => {
          setEditBillModalOpen(false);
          if (selectedAccountId) fetchAccountDetails(selectedAccountId);
          fetchAccounts();
          fetchSummaryData();
        }}
      />
    </div>
  );
}
