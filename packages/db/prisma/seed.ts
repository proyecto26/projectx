import {
  type Prisma,
  PrismaClient,
  ProductStatus,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function createDefaultUser() {
  const defaultUser = await prisma.user.upsert({
    where: { email: "admin@projectx.com" },
    update: {},
    create: {
      email: "admin@projectx.com",
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      status: UserStatus.Active,
    },
  });
  return defaultUser;
}

const products: Omit<Prisma.ProductCreateInput, "user">[] = [
  {
    name: "Gaming Laptop XR-5000",
    description:
      "High-performance gaming laptop with RTX 4080, 32GB RAM, 1TB SSD",
    sku: "TECH-001",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png",
    estimatedPrice: 1499.99,
    downloadUrls: [
      "https://example.com/files/laptop-manual.pdf",
      "https://example.com/files/drivers.zip",
    ],
    tags: ["gaming", "laptop", "rtx4080", "high-performance"],
    category: "Technology",
    status: ProductStatus.Available,
  },
  {
    name: "Professional Camera Kit",
    description: "DSLR Camera with 24-70mm lens, tripod, and carrying case",
    sku: "PHOTO-001",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    estimatedPrice: 899.99,
    downloadUrls: [
      "https://example.com/files/camera-guide.pdf",
      "https://example.com/files/photo-tips.pdf",
    ],
    tags: ["photography", "camera", "professional", "dslr"],
    category: "Photography",
    status: ProductStatus.Available,
  },
  {
    name: "Smart Home Hub",
    description: "Central control unit for home automation with voice control",
    sku: "HOME-001",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/137.png",
    estimatedPrice: 199.99,
    downloadUrls: [
      "https://example.com/files/hub-setup.pdf",
      "https://example.com/files/smart-home-guide.pdf",
    ],
    tags: ["smart-home", "automation", "iot", "voice-control"],
    category: "Home Automation",
    status: ProductStatus.Available,
  },
  {
    name: "Fitness Smartwatch",
    description: "Advanced fitness tracking with heart rate monitor and GPS",
    sku: "WEAR-001",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/474.png",
    estimatedPrice: 299.99,
    downloadUrls: [
      "https://example.com/files/watch-manual.pdf",
      "https://example.com/files/fitness-app.apk",
    ],
    tags: ["fitness", "smartwatch", "health", "gps"],
    category: "Wearables",
    status: ProductStatus.Available,
  },
  {
    name: "Wireless Noise-Canceling Headphones",
    description:
      "Premium audio with active noise cancellation and 30-hour battery",
    sku: "AUDIO-001",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/350.png",
    estimatedPrice: 249.99,
    downloadUrls: [
      "https://example.com/files/headphones-guide.pdf",
      "https://example.com/files/audio-software.zip",
    ],
    tags: ["audio", "wireless", "noise-canceling", "premium"],
    category: "Audio",
    status: ProductStatus.Available,
  },
];

async function main() {
  try {
    console.log("Starting seed...");

    // Create default admin user if not exists
    const adminUser = await createDefaultUser();
    console.log("Default admin user ready:", adminUser.email);

    // Create products
    console.log("Creating products...");
    for (const productData of products) {
      const product = await prisma.product.upsert({
        where: {
          sku: productData.sku,
        },
        update: {},
        create: {
          ...productData,
          user: {
            connect: {
              id: adminUser.id,
            },
          },
        },
      });

      console.log(`Upserted product: ${product.name} (${product.sku})`);
    }

    console.log("Seed completed successfully! 🌱");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Failed to seed database:", e);
  process.exit(1);
});
