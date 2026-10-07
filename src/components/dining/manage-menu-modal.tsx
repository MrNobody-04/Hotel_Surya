"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Utensils,
  FolderPlus,
  Check,
  RefreshCw,
  Tag,
  DollarSign,
  Coffee,
  Beer,
  Sparkles,
} from "lucide-react";

export interface MenuItemData {
  id: string;
  name: string;
  category: "FOOD" | "DRINK" | "SERVICE" | "OTHER";
  categoryName?: string | null;
  defaultPrice: number;
  isActive: boolean;
}

export interface MenuCategoryData {
  id: string;
  name: string;
  icon?: string | null;
  sortOrder: number;
  itemCount?: number;
}

interface ManageMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MenuItemData[];
  categories: MenuCategoryData[];
  onRefresh: () => Promise<void>;
  onItemAdded?: (item: MenuItemData) => void;
}

const PRESET_ICONS = ["🥟", "🍜", "🍛", "🍗", "🍲", "🥤", "🍺", "🍳", "🍰", "☕", "🍕", "🍔", "🥗", "🍱", "🥩", "🧃"];

export function ManageMenuModal({
  open,
  onOpenChange,
  items,
  categories,
  onRefresh,
  onItemAdded,
}: ManageMenuModalProps) {
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [search, setSearch] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("ALL");

  // Add / Edit Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryName, setItemCategoryName] = useState("");
  const [itemType, setItemType] = useState<"FOOD" | "DRINK">("FOOD");
  const [savingItem, setSavingItem] = useState(false);

  // Quick Price Edit Modal
  const [quickPriceModalOpen, setQuickPriceModalOpen] = useState(false);
  const [quickPriceItem, setQuickPriceItem] = useState<MenuItemData | null>(null);
  const [quickPriceVal, setQuickPriceVal] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Add / Edit Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryData | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🍽️");
  const [savingCategory, setSavingCategory] = useState(false);

  // Filter items
  const filteredItems = items.filter((it) => {
    const s = search.toLowerCase().trim();
    const matchSearch = !s || it.name.toLowerCase().includes(s);
    const matchCat =
      selectedCatFilter === "ALL" ||
      it.categoryName === selectedCatFilter ||
      (selectedCatFilter === "FOOD" && it.category === "FOOD") ||
      (selectedCatFilter === "DRINK" && it.category === "DRINK");
    return matchSearch && matchCat;
  });

  // Handlers for Items
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemPrice("");
    setItemCategoryName(categories[0]?.name || "Food");
    setItemType("FOOD");
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItemData) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.defaultPrice));
    setItemCategoryName(item.categoryName || (item.category === "DRINK" ? "Drinks" : "Food"));
    setItemType(item.category === "DRINK" ? "DRINK" : "FOOD");
    setItemModalOpen(true);
  };

  const handleOpenQuickPrice = (item: MenuItemData) => {
    setQuickPriceItem(item);
    setQuickPriceVal(String(item.defaultPrice));
    setQuickPriceModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Item name cannot be empty");
      return;
    }
    const priceNum = Number(itemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price (greater than or equal to 0)");
      return;
    }

    try {
      setSavingItem(true);
      const endpoint = editingItem
        ? `/api/service-items/${editingItem.id}`
        : "/api/service-items";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName.trim(),
          defaultPrice: priceNum,
          category: itemType,
          categoryName: itemCategoryName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save menu item");
      }

      toast.success(
        editingItem
          ? `Updated "${itemName}" (Rs. ${priceNum})`
          : `Added "${itemName}" to menu (Rs. ${priceNum})`
      );

      setItemModalOpen(false);
      await onRefresh();
      if (!editingItem && onItemAdded && data.item) {
        onItemAdded(data.item);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  };

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceItem) return;
    const priceNum = Number(quickPriceVal);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setSavingPrice(true);
      const res = await fetch(`/api/service-items/${quickPriceItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPrice: priceNum }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update price");

      toast.success(`Updated ${quickPriceItem.name} price to Rs. ${priceNum}`);
      setQuickPriceModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update price");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleToggleItemStatus = async (item: MenuItemData) => {
    try {
      const res = await fetch(`/api/service-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!res.ok) throw new Error("Failed to update item status");
      toast.success(
        item.isActive
          ? `Deactivated "${item.name}" from active menu`
          : `Re-activated "${item.name}" on active menu`
      );
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // Handlers for Categories
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatIcon("🍽️");
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: MenuCategoryData) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || "🍽️");
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSavingCategory(true);
      const endpoint = editingCategory
        ? `/api/menu-categories/${editingCategory.id}`
        : "/api/menu-categories";
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          icon: catIcon.trim() || "🍽️",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");

      toast.success(
        editingCategory
          ? `Updated category "${catName}"`
          : `Created new category "${catName}"`
      );
      setCategoryModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: MenuCategoryData) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Items in this category will be reassigned to Food or Drinks.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/menu-categories/${cat.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");

      toast.success(`Category "${cat.name}" deleted`);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  return (
    <>
      {/* MAIN MANAGE MENU MODAL */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[98vw] max-w-4xl max-h-[92dvh] flex flex-col p-3 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <Utensils className="w-5 h-5 text-primary" />
                <span>Restaurant Menu & Price Management</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenAddItem}
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAddCategory}
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Add new dishes and drinks, create custom menu categories, and adjust prices for Cabins & Halls.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs for Menu Items vs Categories */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col min-h-0 overflow-hidden mt-2"
          >
            <div className="flex items-center justify-between shrink-0 pb-2">
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="items" className="text-xs px-3 h-7 font-medium">
                  Dishes & Drinks ({items.length})
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs px-3 h-7 font-medium">
                  Categories ({categories.length})
                </TabsTrigger>
              </TabsList>

              {activeTab === "items" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-44 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search items or rates..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: MENU ITEMS & PRICES */}
            <TabsContent value="items" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0 touch-pan-x">
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter("ALL")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                    selectedCatFilter === "ALL"
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({items.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCatFilter(c.name)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all flex items-center gap-1 ${
                      selectedCatFilter === c.name
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{c.icon || "🍽️"}</span>
                    <span>{c.name}</span>
                    <span className="text-[10px] opacity-75">({c.itemCount || 0})</span>
                  </button>
                ))}
              </div>

              {/* Items List Table */}
              <div
                className="flex-1 overflow-x-auto overflow-y-auto border rounded-xl overscroll-contain"
                style={{ touchAction: "pan-x pan-y", WebkitOverflowScrolling: "touch" }}
              >
                <table className="w-full min-w-[580px] text-xs text-left">
                  <thead className="text-[11px] uppercase bg-muted/60 text-muted-foreground border-b sticky top-0 bg-background z-10">
                    <tr>
                      <th className="px-3 py-2.5">Item Name</th>
                      <th className="px-2.5 py-2.5">Category</th>
                      <th className="px-3 py-2.5 text-right">Default Price (NPR)</th>
                      <th className="px-2.5 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          No menu items found. Click &quot;Add Item&quot; to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-foreground">
                            {item.name}
                          </td>
                          <td className="px-2.5 py-2.5">
                            <Badge variant="outline" className="text-[10px] font-medium gap-1 py-0 px-2">
                              <span>
                                {categories.find((c) => c.name === item.categoryName)?.icon ||
                                  (item.category === "DRINK" ? "🥤" : "🍲")}
                              </span>
                              <span>{item.categoryName || item.category}</span>
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground text-sm">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickPrice(item)}
                              className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors text-right"
                              title="Click to edit price"
                            >
                              <span>{formatCurrency(item.defaultPrice)}</span>
                              <Pencil className="w-3 h-3 text-muted-foreground opacity-40 group-hover:opacity-100 text-primary" />
                            </button>
                          </td>
                          <td className="px-2.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleItemStatus(item)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                item.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                              }`}
                              title={item.isActive ? "Click to deactivate" : "Click to activate"}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenQuickPrice(item)}
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                title="Edit Price"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditItem(item)}
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                title="Edit Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 2: CATEGORIES MANAGEMENT */}
            <TabsContent value="categories" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
              <div className="p-2 border rounded-xl bg-muted/20 flex items-center justify-between mb-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Custom categories organize dishes & drinks into quick filter tabs when taking orders for Cabins & Halls.
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenAddCategory}
                  className="h-7 text-xs gap-1 bg-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Category</span>
                </Button>
              </div>

              <div
                className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-2.5"
                style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
              >
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/20 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-lg bg-muted/40 border">
                        {cat.icon || "🍽️"}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{cat.name}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {cat.itemCount || 0} items
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Order Priority: #{cat.sortOrder}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat)}
                        className="h-7 text-xs gap-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              Total {items.length} items in {categories.length} categories • Instant sync with Cabins & Halls
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT ITEM MODAL */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <form onSubmit={handleSaveItem}>
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" />
                <span>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingItem
                  ? `Modify details and price for "${editingItem.name}"`
                  : "Add a new dish, drink, or service to the restaurant catalog."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="itemNameInput" className="text-xs font-semibold">
                  Item Name *
                </Label>
                <Input
                  id="itemNameInput"
                  placeholder="e.g. Chicken Momo, Cold Coffee, Veg Khana..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="itemPriceInput" className="text-xs font-semibold">
                    Price in NPR (Rs.) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="itemPriceInput"
                      type="number"
                      min="0"
                      step="5"
                      placeholder="e.g. 250"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="h-9 pl-9 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Item Classification</Label>
                  <div className="flex rounded-lg border p-0.5 bg-muted/40 h-9">
                    <button
                      type="button"
                      onClick={() => setItemType("FOOD")}
                      className={`flex-1 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        itemType === "FOOD"
                          ? "bg-background text-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🍲 Food
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemType("DRINK")}
                      className={`flex-1 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        itemType === "DRINK"
                          ? "bg-background text-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🥤 Drink
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="itemCatSelect" className="text-xs font-semibold">
                    Menu Category
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setItemModalOpen(false);
                      handleOpenAddCategory();
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    + Create New Category
                  </button>
                </div>
                <select
                  id="itemCatSelect"
                  value={itemCategoryName}
                  onChange={(e) => setItemCategoryName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon || "🍽️"} {c.name}
                    </option>
                  ))}
                  {/* Fallback option if user types custom */}
                  {!categories.some((c) => c.name === itemCategoryName) && itemCategoryName && (
                    <option value={itemCategoryName}>{itemCategoryName}</option>
                  )}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingItem}
                className="h-8 text-xs bg-primary text-primary-foreground font-bold gap-1.5"
              >
                {savingItem ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingItem ? "Update Item" : "Save to Menu"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK PRICE EDIT MODAL */}
      <Dialog open={quickPriceModalOpen} onOpenChange={setQuickPriceModalOpen}>
        <DialogContent className="max-w-sm p-4 sm:p-5">
          {quickPriceItem && (
            <form onSubmit={handleSaveQuickPrice}>
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Update Item Price</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Change catalog price for <strong className="text-foreground">{quickPriceItem.name}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-3">
                <div className="p-2.5 rounded-lg bg-muted/40 border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Rate:</span>
                  <span className="font-mono font-bold text-foreground line-through">
                    {formatCurrency(quickPriceItem.defaultPrice)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPriceInput" className="text-xs font-semibold">
                    New Rate in NPR (Rs.) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="newPriceInput"
                      type="number"
                      min="0"
                      step="5"
                      autoFocus
                      value={quickPriceVal}
                      onChange={(e) => setQuickPriceVal(e.target.value)}
                      className="h-10 pl-10 text-base font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Quick adjustment pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[10, 20, 50, 100].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setQuickPriceVal(String(Number(quickPriceVal || 0) + delta))}
                      className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-mono font-medium transition-colors"
                    >
                      +{delta}
                    </button>
                  ))}
                  {[10, 20, 50].map((delta) => (
                    <button
                      key={`minus-${delta}`}
                      type="button"
                      onClick={() =>
                        setQuickPriceVal(String(Math.max(0, Number(quickPriceVal || 0) - delta)))
                      }
                      className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-mono font-medium transition-colors"
                    >
                      -{delta}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPriceModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPrice}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                >
                  {savingPrice ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save New Price</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT CATEGORY MODAL */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>{editingCategory ? "Edit Category" : "Create New Menu Category"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingCategory
                  ? `Update name and emoji for "${editingCategory.name}"`
                  : "Create a new category to group dishes and drinks in Cabins and Halls."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="catNameInput" className="text-xs font-semibold">
                  Category Name *
                </Label>
                <Input
                  id="catNameInput"
                  placeholder="e.g. Breakfast, Desserts, Chinese, Bakery..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category Emoji / Icon</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="h-9 w-20 text-center text-lg"
                    placeholder="🍽️"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`text-base p-1 rounded hover:bg-muted transition-colors ${
                          catIcon === emoji ? "bg-primary/20 border border-primary/40" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingCategory}
                className="h-8 text-xs bg-primary text-primary-foreground font-bold gap-1.5"
              >
                {savingCategory ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingCategory ? "Update Category" : "Create Category"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
