import { describe, it, expect } from "vitest";

describe("Menu & Custom Category System", () => {
  interface TestMenuItem {
    id: string;
    name: string;
    category: "FOOD" | "DRINK";
    categoryName: string;
    defaultPrice: number;
    isActive: boolean;
  }

  const sampleItems: TestMenuItem[] = [
    {
      id: "1",
      name: "Steamed Chicken Momo",
      category: "FOOD",
      categoryName: "Momo",
      defaultPrice: 240,
      isActive: true,
    },
    {
      id: "2",
      name: "Veg Chowmein",
      category: "FOOD",
      categoryName: "Chowmin & Chopsy",
      defaultPrice: 160,
      isActive: true,
    },
    {
      id: "3",
      name: "Nepal Masala Milk Tea",
      category: "DRINK",
      categoryName: "Drinks",
      defaultPrice: 50,
      isActive: true,
    },
    {
      id: "4",
      name: "American Pancake Set",
      category: "FOOD",
      categoryName: "Breakfast",
      defaultPrice: 300,
      isActive: true,
    },
    {
      id: "5",
      name: "Chocolate Lava Cake",
      category: "FOOD",
      categoryName: "Dessert",
      defaultPrice: 220,
      isActive: true,
    },
  ];

  it("filters menu items by custom category accurately", () => {
    const filterByCategory = (items: TestMenuItem[], cat: string) => {
      if (cat === "ALL") return items;
      return items.filter((it) => it.categoryName.toLowerCase() === cat.toLowerCase());
    };

    expect(filterByCategory(sampleItems, "Momo")).toHaveLength(1);
    expect(filterByCategory(sampleItems, "Breakfast")).toHaveLength(1);
    expect(filterByCategory(sampleItems, "Breakfast")[0].name).toBe("American Pancake Set");
    expect(filterByCategory(sampleItems, "Dessert")).toHaveLength(1);
    expect(filterByCategory(sampleItems, "ALL")).toHaveLength(5);
  });

  it("updates price of item and preserves non-negative constraints", () => {
    const updateItemPrice = (item: TestMenuItem, newPrice: number) => {
      if (newPrice < 0 || isNaN(newPrice)) {
        throw new Error("Invalid price");
      }
      return { ...item, defaultPrice: newPrice };
    };

    const updated = updateItemPrice(sampleItems[0], 280);
    expect(updated.defaultPrice).toBe(280);
    expect(updated.name).toBe("Steamed Chicken Momo");

    expect(() => updateItemPrice(sampleItems[0], -50)).toThrow("Invalid price");
  });

  it("assigns newly created category to dishes and falls back correctly", () => {
    const createNewItem = (
      name: string,
      price: number,
      categoryName: string,
      isDrink: boolean = false
    ): TestMenuItem => {
      return {
        id: "new_1",
        name: name.trim(),
        category: isDrink ? "DRINK" : "FOOD",
        categoryName: categoryName.trim() || (isDrink ? "Drinks" : "Food"),
        defaultPrice: Math.max(0, price),
        isActive: true,
      };
    };

    const newItem = createNewItem("Cold Brew Coffee", 180, "Beverages", true);
    expect(newItem.name).toBe("Cold Brew Coffee");
    expect(newItem.defaultPrice).toBe(180);
    expect(newItem.category).toBe("DRINK");
    expect(newItem.categoryName).toBe("Beverages");

    const fallbackItem = createNewItem("Simple Bread", 50, "");
    expect(fallbackItem.categoryName).toBe("Food");
  });
});
