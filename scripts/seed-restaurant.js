const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const diningTables = [
  { name: "Cabin 1", type: "CABIN", status: "AVAILABLE", capacity: 4 },
  { name: "Cabin 2", type: "CABIN", status: "AVAILABLE", capacity: 4 },
  { name: "Cabin 3", type: "CABIN", status: "AVAILABLE", capacity: 4 },
  { name: "Hall 1", type: "HALL", status: "AVAILABLE", capacity: 8 },
  { name: "Hall 2", type: "HALL", status: "AVAILABLE", capacity: 8 },
  { name: "Hall 3", type: "HALL", status: "AVAILABLE", capacity: 12 },
];

const menuItems = [
  // Breakfast
  { name: "Bread Omlet", category: "FOOD", defaultPrice: 150 },
  { name: "Jam Bread", category: "FOOD", defaultPrice: 100 },
  { name: "Steem Chana", category: "FOOD", defaultPrice: 100 },
  { name: "Chana Fry", category: "FOOD", defaultPrice: 150 },
  { name: "Dahi Paratha", category: "FOOD", defaultPrice: 200 },

  // Chowmin / Thukpa
  { name: "Mix Chowmin (Full)", category: "FOOD", defaultPrice: 250 },
  { name: "Mix Chowmin (Half)", category: "FOOD", defaultPrice: 150 },
  { name: "Chicken Chowmin (Full)", category: "FOOD", defaultPrice: 200 },
  { name: "Chicken Chowmin (Half)", category: "FOOD", defaultPrice: 120 },
  { name: "Mutton Chowmin (Full)", category: "FOOD", defaultPrice: 230 },
  { name: "Mutton Chowmin (Half)", category: "FOOD", defaultPrice: 170 },
  { name: "Egg Chowmin (Full)", category: "FOOD", defaultPrice: 180 },
  { name: "Egg Chowmin (Half)", category: "FOOD", defaultPrice: 100 },
  { name: "Veg. Chowmin (Full)", category: "FOOD", defaultPrice: 120 },
  { name: "Veg. Chowmin (Half)", category: "FOOD", defaultPrice: 70 },
  { name: "Veg. Thukpa", category: "FOOD", defaultPrice: 120 },
  { name: "Chicken Thukpa", category: "FOOD", defaultPrice: 200 },
  { name: "Egg Thukpa", category: "FOOD", defaultPrice: 180 },
  { name: "American Chopsy", category: "FOOD", defaultPrice: 300 },

  // Drinks & Soft Drinks
  { name: "Coca Cola", category: "DRINK", defaultPrice: 70 },
  { name: "Fanta", category: "DRINK", defaultPrice: 70 },
  { name: "Sprite", category: "DRINK", defaultPrice: 70 },
  { name: "Soft Drink", category: "DRINK", defaultPrice: 70 },
  { name: "Mineral Water", category: "DRINK", defaultPrice: 30 },
  { name: "Xtreme", category: "DRINK", defaultPrice: 200 },
  { name: "Redbull", category: "DRINK", defaultPrice: 150 },
  { name: "Badam Juice", category: "DRINK", defaultPrice: 150 },
  { name: "Ruslan (180 ml)", category: "DRINK", defaultPrice: 650 },
  { name: "Tuborg Strong (650 ml)", category: "DRINK", defaultPrice: 550 },
  { name: "Gorkha Extra Strong (330 ml)", category: "DRINK", defaultPrice: 250 },
  { name: "Hot Lemon", category: "DRINK", defaultPrice: 80 },
  { name: "Lemon Soda", category: "DRINK", defaultPrice: 90 },
  { name: "Lemon Sprite", category: "DRINK", defaultPrice: 70 },
  { name: "Black Coffee", category: "DRINK", defaultPrice: 30 },
  { name: "Milk Coffee", category: "DRINK", defaultPrice: 60 },
  { name: "Black Tea", category: "DRINK", defaultPrice: 20 },
  { name: "Milk Tea", category: "DRINK", defaultPrice: 35 },
  { name: "Hot Milk", category: "DRINK", defaultPrice: 60 },
  { name: "Cold Coffee", category: "DRINK", defaultPrice: 80 },

  // Typical Nepali Food Set & Fried Rice
  { name: "Veg. Khana Set", category: "FOOD", defaultPrice: 250 },
  { name: "Chicken Khana Set", category: "FOOD", defaultPrice: 350 },
  { name: "Mutton Khana Set", category: "FOOD", defaultPrice: 450 },
  { name: "Local Chi. Khana Set", category: "FOOD", defaultPrice: 450 },
  { name: "Egg Khana Set", category: "FOOD", defaultPrice: 300 },
  { name: "Fish Khana Set", category: "FOOD", defaultPrice: 450 },
  { name: "Chicken Fry Rice", category: "FOOD", defaultPrice: 300 },
  { name: "Veg. Fry Rice", category: "FOOD", defaultPrice: 250 },
  { name: "Egg Fry Rice", category: "FOOD", defaultPrice: 280 },
  { name: "Mutton Fry Rice", category: "FOOD", defaultPrice: 320 },
  { name: "Mix Fry Rice", category: "FOOD", defaultPrice: 300 },

  // Papad & Salad
  { name: "Papad Dry", category: "FOOD", defaultPrice: 15 },
  { name: "Papad Fry", category: "FOOD", defaultPrice: 20 },
  { name: "Masala Papad", category: "FOOD", defaultPrice: 50 },
  { name: "Green Salad", category: "FOOD", defaultPrice: 150 },
  { name: "Fruits Salad", category: "FOOD", defaultPrice: 250 },
  { name: "Mix Salad", category: "FOOD", defaultPrice: 200 },

  // Appetizer / Soup
  { name: "Veg. Clear Soup", category: "FOOD", defaultPrice: 150 },
  { name: "Chi. Clear Soup", category: "FOOD", defaultPrice: 200 },
  { name: "Veg. Hot & Sour Soup", category: "FOOD", defaultPrice: 180 },
  { name: "Chi. Hot & Sour Soup", category: "FOOD", defaultPrice: 180 },
  { name: "Mushroom Soup", category: "FOOD", defaultPrice: 150 },
  { name: "Sweet Corn Soup", category: "FOOD", defaultPrice: 180 },
  { name: "Corn Salt & Pepper", category: "FOOD", defaultPrice: 250 },
  { name: "Mushroom Chilly", category: "FOOD", defaultPrice: 350 },
  { name: "Mushroom Fry", category: "FOOD", defaultPrice: 300 },
  { name: "French Fries", category: "FOOD", defaultPrice: 200 },
  { name: "Crispy Potato", category: "FOOD", defaultPrice: 150 },
  { name: "Paneer Pakoda", category: "FOOD", defaultPrice: 350 },
  { name: "Paneer Chilly", category: "FOOD", defaultPrice: 400 },

  // Chicken Dishes
  { name: "Chicken Fry", category: "FOOD", defaultPrice: 350 },
  { name: "Chicken Chilly", category: "FOOD", defaultPrice: 370 },
  { name: "Chicken Sadheko", category: "FOOD", defaultPrice: 350 },
  { name: "Chicken Lollipop", category: "FOOD", defaultPrice: 350 },
  { name: "Chicken Leg Piece", category: "FOOD", defaultPrice: 330 },
  { name: "Chicken Sausage", category: "FOOD", defaultPrice: 350 },
  { name: "Chicken Gravy", category: "FOOD", defaultPrice: 350 },
  { name: "Chicken Wings", category: "FOOD", defaultPrice: 300 },
  { name: "Local Chi. Gravy", category: "FOOD", defaultPrice: 450 },
  { name: "Chicken Steam (Dish)", category: "FOOD", defaultPrice: 300 },
  { name: "Fish Fry", category: "FOOD", defaultPrice: 400 },
  { name: "Battai Birds", category: "FOOD", defaultPrice: 350 },

  // Mutton
  { name: "Mutton Hakula", category: "FOOD", defaultPrice: 450 },
  { name: "Mutton Rajkhane Set", category: "FOOD", defaultPrice: 850 },
  { name: "Mutton Bhutan", category: "FOOD", defaultPrice: 400 },
  { name: "Mutton Gravy", category: "FOOD", defaultPrice: 450 },
  { name: "Mutton Taas", category: "FOOD", defaultPrice: 450 },
  { name: "Mutton Fry", category: "FOOD", defaultPrice: 450 },
  { name: "Chhoila Duck", category: "FOOD", defaultPrice: 400 },

  // Sadheko & Snacks
  { name: "Peanuts Sadheko", category: "FOOD", defaultPrice: 200 },
  { name: "Chana Sadheko", category: "FOOD", defaultPrice: 150 },
  { name: "Bhatmas Sadheko", category: "FOOD", defaultPrice: 150 },
  { name: "Chauchau Sadheko", category: "FOOD", defaultPrice: 150 },
  { name: "Kaju Fry", category: "FOOD", defaultPrice: 400 },
  { name: "Chatpat", category: "FOOD", defaultPrice: 150 },

  // Eggs
  { name: "Mix Omelet (2 pcs)", category: "FOOD", defaultPrice: 150 },
  { name: "Plain Omelet (2 pcs)", category: "FOOD", defaultPrice: 120 },
  { name: "Boiled Egg (Per Pcs)", category: "FOOD", defaultPrice: 40 },
  { name: "Egg Mix Bhurji", category: "FOOD", defaultPrice: 150 },

  // Momo
  { name: "Chicken Steam Momo", category: "FOOD", defaultPrice: 160 },
  { name: "Chicken Fry Momo", category: "FOOD", defaultPrice: 200 },
  { name: "C Momo", category: "FOOD", defaultPrice: 270 },
  { name: "Jhol Momo", category: "FOOD", defaultPrice: 200 },
];

async function main() {
  console.log("Seeding Dining Tables (Cabins & Halls)...");
  for (const table of diningTables) {
    await prisma.diningTable.upsert({
      where: { name: table.name },
      update: {
        type: table.type,
        capacity: table.capacity,
      },
      create: {
        name: table.name,
        type: table.type,
        status: table.status,
        capacity: table.capacity,
      },
    });
  }
  console.log("6 Dining Tables (Cabin 1-3, Hall 1-3) seeded successfully!");

  console.log(`Seeding ${menuItems.length} official Hotel Surya Menu Items...`);
  for (const item of menuItems) {
    await prisma.serviceItem.upsert({
      where: { name: item.name },
      update: {
        category: item.category,
        defaultPrice: item.defaultPrice,
        isActive: true,
      },
      create: {
        name: item.name,
        category: item.category,
        defaultPrice: item.defaultPrice,
        isActive: true,
      },
    });
  }
  console.log("Official Hotel Surya Menu seeded successfully!");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
