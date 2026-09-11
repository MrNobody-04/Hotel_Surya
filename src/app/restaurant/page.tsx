"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Utensils,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  DollarSign,
  Coffee,
  X,
  CreditCard,
  Trash2,
  AlertTriangle,
  Receipt,
  User,
  Phone,
  RefreshCw,
  Sparkles,
  Users,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNepalDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentQrModal } from "@/components/billing/payment-qr-modal";
import { BillItemCategory, PaymentMethod } from "@/types";

const QUICK_CATEGORIES = [
  { id: "ALL", label: "All Items" },
  { id: "FOOD", label: "🍲 Food" },
  { id: "DRINK", label: "🥤 Drinks" },
  { id: "MOMO", label: "🥟 Momo" },
  { id: "CHOWMIN", label: "🍜 Chowmin & Chopsy" },
  { id: "KHANA", label: "🍛 Khana Set" },
  { id: "SNACKS", label: "🍗 Snacks" },
  { id: "BEERS", label: "🍺 Beers & Spirits" },
];

interface MenuItem {
  id: string;
  name: string;
  category: BillItemCategory;
  defaultPrice: number;
}

interface OrderItem {
  id?: string;
  name: string;
  category: BillItemCategory;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
}

interface TableData {
  id: string;
  name: string;
  type: "CABIN" | "HALL";
  status: "AVAILABLE" | "OCCUPIED";
  capacity: number;
  notes?: string | null;
  activeOrder?: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    guestCount: number;
    totalAmount: number;
    paidAmount: number;
    createdAt: string;
    notes?: string | null;
    items: OrderItem[];
  } | null;
}

export default function RestaurantPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: "tables" or "history"
  const [viewTab, setViewTab] = useState<"tables" | "history">("tables");
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Order / Add Items Dialog
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [isAddingMore, setIsAddingMore] = useState(false); // true if adding to existing active order

  // Order Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guestCount, setGuestCount] = useState("2");
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedTray, setSelectedTray] = useState<{ [name: string]: { item: MenuItem; qty: number; notes: string } }>({});
  const [menuSearch, setMenuSearch] = useState("");
  const [quickCategory, setQuickCategory] = useState("ALL");
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [mobileOrderPane, setMobileOrderPane] = useState<"menu" | "tray">("menu");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Custom Item Inputs
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Table Bill Details Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [activeBillTable, setActiveBillTable] = useState<TableData | null>(null);

  // Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>("CASH");
  const [settleNotes, setSettleNotes] = useState("Restaurant bill settlement");
  const [settling, setSettling] = useState(false);

  // Standalone QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Cancel Order State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dining/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dining tables");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("/api/service-items");
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/dining/history?limit=50");
      if (res.ok) {
        const data = await res.json();
        setHistoryOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load restaurant history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (viewTab === "history") {
      fetchHistory();
    }
  }, [viewTab]);

  // Handle Opening "New Order"
  const handleOpenNewOrder = (table: TableData) => {
    setSelectedTable(table);
    setIsAddingMore(false);
    setCustomerName(table.name); // Automatically take Table or Hall name!
    setCustomerPhone("");
    setGuestCount(String(table.capacity || 2));
    setOrderNotes("");
    setSelectedTray({});
    setMenuSearch("");
    setQuickCategory("ALL");
    setShowGuestDetails(false);
    setShowCustomItem(false);
    setMobileOrderPane("menu");
    setOrderModalOpen(true);
  };

  // Handle Opening "Add More Items" to existing order
  const handleOpenAddItems = (table: TableData) => {
    setSelectedTable(table);
    setIsAddingMore(true);
    setSelectedTray({});
    setMenuSearch("");
    setQuickCategory("ALL");
    setShowGuestDetails(false);
    setShowCustomItem(false);
    setMobileOrderPane("menu");
    setOrderModalOpen(true);
  };

  // Tray helpers
  const handleAddItemToTray = (item: MenuItem) => {
    setSelectedTray((prev) => {
      const existing = prev[item.name];
      if (existing) {
        return {
          ...prev,
          [item.name]: { ...existing, qty: existing.qty + 1 },
        };
      }
      return {
        ...prev,
        [item.name]: { item, qty: 1, notes: "" },
      };
    });
  };

  const handleUpdateTrayQty = (name: string, delta: number) => {
    setSelectedTray((prev) => {
      const existing = prev[name];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      }
      return {
        ...prev,
        [name]: { ...existing, qty: newQty },
      };
    });
  };

  const handleAddCustomToTray = () => {
    if (!customName.trim() || Number(customPrice) < 0 || isNaN(Number(customPrice))) {
      toast.error("Enter a valid item name and price");
      return;
    }
    const customItem: MenuItem = {
      id: "custom-" + Date.now(),
      name: customName.trim(),
      category: "FOOD",
      defaultPrice: Number(customPrice),
    };
    setSelectedTray((prev) => ({
      ...prev,
      [customItem.name]: {
        item: customItem,
        qty: Math.max(1, parseInt(customQty) || 1),
        notes: "Custom Kitchen Order",
      },
    }));
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    toast.success("Custom item added to order tray");
  };

  const trayTotal = useMemo(() => {
    return Object.values(selectedTray).reduce(
      (sum, val) => sum + val.qty * val.item.defaultPrice,
      0
    );
  }, [selectedTray]);

  // Submit Order (New or Add Items)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const trayItemsArray = Object.values(selectedTray).map((t) => ({
      name: t.item.name,
      category: t.item.category,
      quantity: t.qty,
      unitPrice: t.item.defaultPrice,
      notes: t.notes || null,
    }));

    if (trayItemsArray.length === 0 && isAddingMore) {
      toast.error("Select at least one item to add to the order");
      return;
    }

    setSubmittingOrder(true);
    try {
      if (isAddingMore) {
        // Add items to existing active order
        const res = await fetch(`/api/dining/orders/${selectedTable.activeOrder?.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: trayItemsArray }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add items to order");
        toast.success(`Added ${trayItemsArray.length} items to ${selectedTable.name}`);
      } else {
        // Start brand new order
        const res = await fetch("/api/dining/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: selectedTable.id,
            customerName: customerName.trim() || "Walk-in Customer",
            customerPhone: customerPhone.trim() || null,
            guestCount: Number(guestCount) || 1,
            notes: orderNotes.trim() || null,
            items: trayItemsArray,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start order");
        toast.success(`Order started for ${selectedTable.name}`);
      }

      setOrderModalOpen(false);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Open Settle Modal
  const handleOpenSettle = (table: TableData) => {
    setActiveBillTable(table);
    setSettleAmount(String(table.activeOrder?.totalAmount || "0"));
    setSettleMethod("CASH");
    setSettleNotes(`Payment for ${table.name}`);
    setSettleModalOpen(true);
  };

  // Submit Settlement
  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBillTable?.activeOrder) return;

    setSettling(true);
    try {
      const res = await fetch(`/api/dining/orders/${activeBillTable.activeOrder.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(settleAmount),
          method: settleMethod,
          notes: settleNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle bill");

      toast.success(`${activeBillTable.name} settled successfully (${formatCurrency(Number(settleAmount))})!`);
      setSettleModalOpen(false);
      setBillModalOpen(false);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSettling(false);
    }
  };

  // Cancel/Void Order
  const handleCancelOrder = async () => {
    if (!activeBillTable?.activeOrder) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/dining/orders/${activeBillTable.activeOrder.id}?mode=cancel`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      toast.success(`Order on ${activeBillTable.name} cancelled. Table is now AVAILABLE.`);
      setCancelModalOpen(false);
      setBillModalOpen(false);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Filtered menu list
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((it) => {
      const search = menuSearch.toLowerCase().trim();
      const matchesSearch = !search || it.name.toLowerCase().includes(search);

      let matchesCat = true;
      if (quickCategory === "FOOD") {
        matchesCat = it.category === "FOOD";
      } else if (quickCategory === "DRINK") {
        matchesCat = it.category === "DRINK";
      } else if (quickCategory === "MOMO") {
        matchesCat = it.name.toLowerCase().includes("momo");
      } else if (quickCategory === "CHOWMIN") {
        const n = it.name.toLowerCase();
        matchesCat = n.includes("chowmin") || n.includes("thukpa") || n.includes("chopsy");
      } else if (quickCategory === "KHANA") {
        const n = it.name.toLowerCase();
        matchesCat = n.includes("khana") || n.includes("rice") || n.includes("curry") || n.includes("dal");
      } else if (quickCategory === "SNACKS") {
        const n = it.name.toLowerCase();
        matchesCat =
          n.includes("chana") ||
          n.includes("sadeko") ||
          n.includes("peanut") ||
          n.includes("chips") ||
          n.includes("fry") ||
          n.includes("chilli") ||
          n.includes("bread") ||
          n.includes("omlet") ||
          n.includes("paratha") ||
          n.includes("boiled") ||
          n.includes("sekwa") ||
          n.includes("pork") ||
          n.includes("sukuti");
      } else if (quickCategory === "BEERS") {
        const n = it.name.toLowerCase();
        matchesCat =
          n.includes("beer") ||
          n.includes("tuborg") ||
          n.includes("gorkha") ||
          n.includes("ruslan") ||
          n.includes("whisky") ||
          n.includes("vodka") ||
          n.includes("rum") ||
          n.includes("wine") ||
          n.includes("cider");
      }

      return matchesSearch && matchesCat;
    });
  }, [menuItems, menuSearch, quickCategory]);

  const cabins = tables.filter((t) => t.type === "CABIN");
  const halls = tables.filter((t) => t.type === "HALL");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Utensils className="w-6 h-6 text-primary" />
            <span>Restaurant & Dining Orders</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage walk-in customers and table orders for Cabins (1–3) and Halls (1–3)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrModalOpen(true)}
            className="h-9 gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nabil QR</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTables}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs: Live Tables vs History */}
      <Tabs value={viewTab} onValueChange={(val: any) => setViewTab(val)} className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="tables" className="gap-1.5">
            <Utensils className="w-4 h-4" />
            <span>Live Dining Tables</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Receipt className="w-4 h-4" />
            <span>Order History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-6">
          {/* Section: Cabins */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Coffee className="w-4 h-4 text-purple-600" />
                <span>Private Dining Cabins</span>
              </h2>
              <span className="text-xs text-muted-foreground">3 Private Cabins</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {cabins.map((table) => {
                const isOccupied = table.status === "OCCUPIED" && table.activeOrder;
                return (
                  <Card
                    key={table.id}
                    className={`shadow-sm border-2 transition-all flex flex-col justify-between ${
                      isOccupied
                        ? "border-amber-500/60 bg-amber-500/5 hover:border-amber-500"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold font-mono px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                            {table.name}
                          </span>
                          <Badge variant="purple" className="text-[10px]">
                            CABIN
                          </Badge>
                        </div>
                        <Badge variant={isOccupied ? "warning" : "success"}>
                          {isOccupied ? "OCCUPIED" : "AVAILABLE"}
                        </Badge>
                      </div>

                      {isOccupied ? (
                        <div className="mt-3 space-y-1">
                          <div className="text-sm font-bold text-foreground">
                            {table.activeOrder?.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            <span>{table.activeOrder?.guestCount} Guest(s)</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatNepalDateTime(table.activeOrder?.createdAt).split(", ")[1]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Ready for guests • Capacity {table.capacity} people
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="py-3 text-xs space-y-2 flex-1">
                      {isOccupied ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between font-medium text-muted-foreground">
                            <span>Items Ordered:</span>
                            <span className="font-bold text-foreground">
                              {table.activeOrder?.items.length || 0} item(s)
                            </span>
                          </div>
                          <div className="p-2.5 bg-background border rounded-lg flex items-center justify-between">
                            <span className="font-semibold text-xs">Current Bill:</span>
                            <span className="font-mono text-base font-black text-foreground">
                              {formatCurrency(table.activeOrder?.totalAmount || 0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground/70 italic text-xs">
                          Table is vacant
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2 pb-3 px-4 border-t bg-muted/10 grid grid-cols-2 gap-2">
                      {isOccupied ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveBillTable(table);
                              setBillModalOpen(true);
                            }}
                            className="w-full text-xs h-8"
                          >
                            View Bill / Add
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenSettle(table)}
                            className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Settle Bill
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenNewOrder(table)}
                          className="w-full col-span-2 text-xs h-8 bg-primary gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Take Order</span>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section: Halls */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Main Dining Halls</span>
              </h2>
              <span className="text-xs text-muted-foreground">3 Dining Halls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {halls.map((table) => {
                const isOccupied = table.status === "OCCUPIED" && table.activeOrder;
                return (
                  <Card
                    key={table.id}
                    className={`shadow-sm border-2 transition-all flex flex-col justify-between ${
                      isOccupied
                        ? "border-amber-500/60 bg-amber-500/5 hover:border-amber-500"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold font-mono px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                            {table.name}
                          </span>
                          <Badge variant="info" className="text-[10px]">
                            HALL
                          </Badge>
                        </div>
                        <Badge variant={isOccupied ? "warning" : "success"}>
                          {isOccupied ? "OCCUPIED" : "AVAILABLE"}
                        </Badge>
                      </div>

                      {isOccupied ? (
                        <div className="mt-3 space-y-1">
                          <div className="text-sm font-bold text-foreground">
                            {table.activeOrder?.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            <span>{table.activeOrder?.guestCount} Guest(s)</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatNepalDateTime(table.activeOrder?.createdAt).split(", ")[1]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Ready for guests • Capacity {table.capacity} people
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="py-3 text-xs space-y-2 flex-1">
                      {isOccupied ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between font-medium text-muted-foreground">
                            <span>Items Ordered:</span>
                            <span className="font-bold text-foreground">
                              {table.activeOrder?.items.length || 0} item(s)
                            </span>
                          </div>
                          <div className="p-2.5 bg-background border rounded-lg flex items-center justify-between">
                            <span className="font-semibold text-xs">Current Bill:</span>
                            <span className="font-mono text-base font-black text-foreground">
                              {formatCurrency(table.activeOrder?.totalAmount || 0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground/70 italic text-xs">
                          Table is vacant
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2 pb-3 px-4 border-t bg-muted/10 grid grid-cols-2 gap-2">
                      {isOccupied ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveBillTable(table);
                              setBillModalOpen(true);
                            }}
                            className="w-full text-xs h-8"
                          >
                            View Bill / Add
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenSettle(table)}
                            className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Settle Bill
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenNewOrder(table)}
                          className="w-full col-span-2 text-xs h-8 bg-primary gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Take Order</span>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Completed Restaurant Orders</CardTitle>
                <CardDescription>
                  Historical settled dining records from Cabins and Halls
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={historyLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading order history...
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs">
                  No completed restaurant orders yet.
                </div>
              ) : (
                <div className="w-full overflow-x-auto max-w-full">
                  <table className="w-full min-w-[550px] text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Items Ordered</th>
                        <th className="px-4 py-3">Settled At</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {historyOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            #{ord.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {ord.table?.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {ord.customerName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {ord.items?.length || 0} item(s):{" "}
                            {ord.items?.map((i: any) => `${i.name} (${i.quantity})`).slice(0, 3).join(", ")}
                            {ord.items?.length > 3 ? "..." : ""}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {ord.settledAt ? formatNepalDateTime(ord.settledAt) : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px]">
                              {ord.paymentMethod || "CASH"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(ord.paidAmount || ord.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TAKE ORDER / ADD ITEMS DIALOG (Optimized for iPhone 15 Pro Max & Desktop) */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="w-[98vw] max-w-4xl max-h-[94dvh] h-[94dvh] flex flex-col p-2.5 sm:p-5 overflow-hidden">
          <form onSubmit={handleSubmitOrder} className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
            {/* Dialog Header */}
            <DialogHeader className="shrink-0 pb-1.5 sm:pb-2 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
                  <Utensils className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">
                    {isAddingMore
                      ? `Add Items — ${selectedTable?.name}`
                      : `New Order — ${selectedTable?.name}`}
                  </span>
                </DialogTitle>
                <Badge variant="purple" className="font-mono text-xs shrink-0">
                  {selectedTable?.name}
                </Badge>
              </div>
              <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                {isAddingMore
                  ? "Select items from the official NEW HOTEL SURYA menu or enter custom kitchen orders"
                  : "Enter customer details and select food & drinks from the official menu"}
              </DialogDescription>
            </DialogHeader>

            {/* Customer Details (only on new order) */}
            {!isAddingMore && (
              <>
                {/* Mobile View: Compact 1-line bar by default, expandable on tap */}
                <div className="sm:hidden shrink-0 my-1">
                  {!showGuestDetails ? (
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 rounded-lg border text-xs">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold truncate text-foreground text-xs">
                          {customerName || selectedTable?.name}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground shrink-0 text-[11px] font-mono">
                          {guestCount} Guests
                        </span>
                        {customerPhone && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground font-mono text-[11px] truncate">
                              {customerPhone}
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowGuestDetails(true)}
                        className="h-6 px-2 text-[11px] text-primary hover:text-primary shrink-0 gap-1 font-semibold"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-muted/40 rounded-xl border space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">Guest & Table Info</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowGuestDetails(false)}
                          className="h-6 px-2 text-[11px] text-muted-foreground"
                        >
                          ✕ Close
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="custNameMob" className="text-[11px] font-semibold">Table / Customer Name *</Label>
                          <Input
                            id="custNameMob"
                            placeholder="e.g. Cabin 1 or Guest Name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-8 text-xs font-medium"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="custPhoneMob" className="text-[11px]">Phone (Optional)</Label>
                            <Input
                              id="custPhoneMob"
                              placeholder="98XXXXXXXX"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="gCountMob" className="text-[11px]">Guests</Label>
                            <Input
                              id="gCountMob"
                              type="number"
                              min="1"
                              value={guestCount}
                              onChange={(e) => setGuestCount(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop View: 3-column inline row */}
                <div className="hidden sm:grid grid-cols-3 gap-3 p-2.5 bg-muted/40 rounded-xl border text-xs shrink-0 my-1">
                  <div className="space-y-1">
                    <Label htmlFor="custName" className="text-[11px] font-semibold">Customer / Table Name</Label>
                    <Input
                      id="custName"
                      placeholder="e.g. Cabin 1 or Guest Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custPhone" className="text-[11px]">Phone (Optional)</Label>
                    <Input
                      id="custPhone"
                      placeholder="e.g. 9848040883"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gCount" className="text-[11px]">Number of Guests</Label>
                    <Input
                      id="gCount"
                      type="number"
                      min="1"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Mobile Tab Switcher between Menu and Tray (Hidden on large screens) */}
            <div className="lg:hidden flex items-center p-0.5 bg-muted/80 rounded-xl text-xs font-semibold shrink-0 gap-1 my-1 border">
              <button
                type="button"
                onClick={() => setMobileOrderPane("menu")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs",
                  mobileOrderPane === "menu"
                    ? "bg-background text-foreground shadow-sm font-bold border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Search className="w-3.5 h-3.5 text-primary" />
                <span>Menu ({filteredMenuItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileOrderPane("tray")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs",
                  mobileOrderPane === "tray"
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>
                  Tray ({Object.keys(selectedTray).length}) • {formatCurrency(trayTotal)}
                </span>
              </button>
            </div>

            {/* Main Menu & Tray Split Screen */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-hidden min-h-0 my-1">
              {/* Left Column: Menu Catalog Picker */}
              <div
                className={cn(
                  "lg:col-span-7 flex flex-col border rounded-xl overflow-hidden bg-background h-full min-h-0",
                  mobileOrderPane !== "menu" && "hidden lg:flex"
                )}
              >
                {/* Search & Category Filter Bar */}
                <div className="p-2 border-b bg-muted/20 space-y-1.5 shrink-0">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search dishes or drinks (Momo, Beer, Chopsy...)"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="h-8 pl-8 pr-7 text-xs"
                    />
                    {menuSearch && (
                      <button
                        type="button"
                        onClick={() => setMenuSearch("")}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Horizontal Scrollable Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar touch-pan-x">
                    {QUICK_CATEGORIES.map((cat) => {
                      const isSelected = quickCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setQuickCategory(cat.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Menu Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 overscroll-contain">
                  {filteredMenuItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No dishes or drinks match &quot;{menuSearch}&quot;
                    </div>
                  ) : (
                    filteredMenuItems.map((item) => {
                      const qtyInTray = selectedTray[item.name]?.qty || 0;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-2 sm:p-2.5 rounded-lg border transition-all text-xs",
                            qtyInTray > 0
                              ? "border-primary/50 bg-primary/5 shadow-xs"
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
                              {item.name}
                            </div>
                            <div className="text-muted-foreground font-mono text-[11px]">
                              {formatCurrency(item.defaultPrice)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {qtyInTray > 0 ? (
                              <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-primary/40 shadow-xs">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateTrayQty(item.name, -1)}
                                  className="h-7 w-7 text-xs font-bold hover:bg-destructive/10 hover:text-destructive"
                                >
                                  -
                                </Button>
                                <span className="font-mono font-bold px-1.5 text-primary text-xs min-w-[20px] text-center">
                                  {qtyInTray}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateTrayQty(item.name, 1)}
                                  className="h-7 w-7 text-xs font-bold hover:bg-primary/10 hover:text-primary"
                                >
                                  +
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddItemToTray(item)}
                                className="h-7 text-xs px-2.5 gap-1 hover:border-primary hover:text-primary font-medium"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Collapsible Custom Kitchen Item */}
                <div className="p-2 border-t bg-muted/20 shrink-0">
                  {!showCustomItem ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomItem(true)}
                      className="w-full py-1.5 px-3 rounded-lg border border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Custom Off-Menu Item</span>
                    </button>
                  ) : (
                    <div className="space-y-2 p-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">Custom Kitchen Order:</span>
                        <button
                          type="button"
                          onClick={() => setShowCustomItem(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                        <Input
                          placeholder="Item name (e.g. Special Salad)"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="sm:col-span-6 h-8 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="sm:col-span-3 h-8 text-xs font-mono font-bold"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleAddCustomToTray();
                            setShowCustomItem(false);
                          }}
                          className="sm:col-span-3 h-8 text-xs font-semibold"
                        >
                          Add to Tray
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Order Tray */}
              <div
                className={cn(
                  "lg:col-span-5 flex flex-col border-2 border-primary/30 rounded-xl overflow-hidden bg-muted/10 h-full min-h-0",
                  mobileOrderPane !== "tray" && "hidden lg:flex"
                )}
              >
                <div className="p-2.5 border-b bg-primary/10 flex items-center justify-between shrink-0">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-primary">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Order Tray ({Object.keys(selectedTray).length} items)</span>
                  </div>
                  {Object.keys(selectedTray).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTray({})}
                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                    >
                      Clear Tray
                    </Button>
                  )}
                </div>

                {/* Tray Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 overscroll-contain">
                  {Object.keys(selectedTray).length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                      <p>Tray is empty.</p>
                      <p className="text-[11px]">Select dishes from the menu catalog to add.</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setMobileOrderPane("menu")}
                        className="lg:hidden text-xs mt-2"
                      >
                        ← Go to Menu Catalog
                      </Button>
                    </div>
                  ) : (
                    Object.values(selectedTray).map(({ item, qty }) => (
                      <div
                        key={item.name}
                        className="p-2 bg-background border rounded-lg flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {qty} × {formatCurrency(item.defaultPrice)} ={" "}
                            <strong className="text-foreground">
                              {formatCurrency(qty * item.defaultPrice)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => handleUpdateTrayQty(item.name, -1)}
                            className="h-7 w-7 text-xs"
                          >
                            -
                          </Button>
                          <span className="font-mono font-bold px-1 text-xs min-w-[18px] text-center">{qty}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => handleUpdateTrayQty(item.name, 1)}
                            className="h-7 w-7 text-xs"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tray Running Total */}
                <div className="p-2.5 border-t bg-background flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">
                    Tray Total:
                  </span>
                  <span className="font-mono text-base font-black text-foreground">
                    {formatCurrency(trayTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-2 border-t bg-background flex items-center justify-between gap-2 shrink-0 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderModalOpen(false)}
                disabled={submittingOrder}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {mobileOrderPane === "menu" && Object.keys(selectedTray).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMobileOrderPane("tray")}
                    className="lg:hidden h-9 px-2.5 text-xs gap-1 border-primary/40 text-primary font-semibold"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Tray ({Object.keys(selectedTray).length})</span>
                  </Button>
                )}

                {mobileOrderPane === "tray" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMobileOrderPane("menu")}
                    className="lg:hidden h-9 px-2.5 text-xs gap-1"
                  >
                    <span>← Menu</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={submittingOrder || (isAddingMore && Object.keys(selectedTray).length === 0)}
                  className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 text-xs gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {submittingOrder
                      ? "Saving..."
                      : isAddingMore
                      ? `Add (${formatCurrency(trayTotal)})`
                      : `Place Order (${formatCurrency(trayTotal)})`}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* LIVE TABLE BILL DETAILS MODAL */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="w-[96vw] max-w-xl max-h-[90dvh] flex flex-col p-3 sm:p-6 overflow-hidden">
          {activeBillTable && activeBillTable.activeOrder && (
            <div className="flex flex-col flex-1 overflow-hidden space-y-3 min-h-0">
              <DialogHeader className="shrink-0 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    {activeBillTable.name} — Live Bill
                  </DialogTitle>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                    OCCUPIED
                  </span>
                </div>
                <DialogDescription className="text-xs">
                  Guest: <strong className="text-foreground">{activeBillTable.activeOrder.customerName}</strong>
                  {activeBillTable.activeOrder.customerPhone ? ` (${activeBillTable.activeOrder.customerPhone})` : ""}
                  {" • "}Seated at: {formatNepalDateTime(activeBillTable.activeOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Items List Table */}
              <div className="w-full overflow-y-auto max-h-[44vh] border rounded-lg max-w-full flex-1 min-h-0">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-[11px] sm:text-xs uppercase bg-muted/50 text-muted-foreground border-b sticky top-0 bg-background">
                    <tr>
                      <th className="px-2.5 py-2">Item</th>
                      <th className="px-1.5 py-2 text-center">Qty</th>
                      <th className="px-2 py-2 text-right">Rate</th>
                      <th className="px-2.5 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {activeBillTable.activeOrder.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-muted/20">
                        <td className="px-2.5 py-2 font-medium">
                          {it.name}
                          {it.notes && (
                            <span className="block text-[10px] text-muted-foreground italic">
                              {it.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          {formatCurrency(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Card */}
              <div className="p-2.5 sm:p-3 bg-muted/30 border rounded-xl flex items-center justify-between shrink-0">
                <span className="font-bold text-xs sm:text-sm">TOTAL AMOUNT DUE:</span>
                <span className="font-mono text-lg sm:text-xl font-black text-foreground">
                  {formatCurrency(activeBillTable.activeOrder.totalAmount)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBillModalOpen(false);
                      handleOpenAddItems(activeBillTable);
                    }}
                    className="h-8 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Items</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    className="h-8 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Void</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 text-xs gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setBillModalOpen(false);
                      handleOpenSettle(activeBillTable);
                    }}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Settle Bill</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SETTLEMENT MODAL */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="w-[96vw] max-w-md p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
          <form onSubmit={handleConfirmSettle} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Settle Bill — {activeBillTable?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Collect payment and free {activeBillTable?.name} for new guests
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Total Amount Due:
              </span>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
                {formatCurrency(activeBillTable?.activeOrder?.totalAmount || 0)}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="settleAmt">Payment Amount (NPR)</Label>
                <Input
                  id="settleAmt"
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="font-mono font-bold text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="settleMeth">Payment Method</Label>
                <Select value={settleMethod} onValueChange={(v: any) => setSettleMethod(v)}>
                  <SelectTrigger id="settleMeth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Payment</SelectItem>
                    <SelectItem value="QR_PAYMENT">Nabil Bank / QR Payment</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / ConnectIPS</SelectItem>
                    <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* QR Preview Card if QR Selected */}
              {settleMethod === "QR_PAYMENT" && (
                <div className="p-3 bg-background border-2 border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/nabil-qr.jpg"
                      alt="Nabil QR"
                      className="w-14 h-14 object-contain rounded border"
                    />
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        Nabil Bank QR (SUJAN G.C.)
                      </div>
                      <div className="font-mono font-bold text-foreground">
                        A/C: 27710017501941
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQrModalOpen(true)}
                    className="h-7 text-xs border-emerald-600 text-emerald-700"
                  >
                    View QR
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettleModalOpen(false)}
                disabled={settling}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={settling}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {settling ? "Settling..." : "Confirm & Free Table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCEL / VOID ORDER CONFIRMATION */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Void Order on {activeBillTable?.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will cancel this dining order and immediately reset {activeBillTable?.name} back to AVAILABLE.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {cancelling ? "Voiding..." : "Confirm Void Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone QR Modal */}
      <PaymentQrModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        dueAmount={Number(settleAmount) || activeBillTable?.activeOrder?.totalAmount || 0}
        guestName={activeBillTable?.activeOrder?.customerName || "Restaurant Customer"}
      />
    </div>
  );
}
