import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  type Prisma,
  PrismaClient,
  ProductStatus,
  UserStatus,
} from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Admin users to seed
const adminUsers = [
  {
    email: "admin@projectx.com",
    username: "admin",
    firstName: "Admin",
    lastName: "User",
  },
];

async function createRoles() {
  // Create Admin role
  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: { name: "Admin", description: "Administrator with full access" },
    create: {
      name: "Admin",
      description: "Administrator with full access",
    },
  });
  console.log("Admin role ready:", adminRole.name);

  // Create User role
  const userRole = await prisma.role.upsert({
    where: { id: 2 },
    update: { name: "User", description: "Regular user with basic access" },
    create: {
      name: "User",
      description: "Regular user with basic access",
    },
  });
  console.log("User role ready:", userRole.name);

  return { adminRole, userRole };
}

async function createAdminUsers(adminRoleId: number) {
  const createdUsers = [];

  for (const userData of adminUsers) {
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      create: {
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        status: UserStatus.Active,
      },
    });

    // Assign admin role to user (upsert to avoid duplicates)
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRoleId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: adminRoleId,
      },
    });

    console.log(`Admin user ready: ${user.email}`);
    createdUsers.push(user);
  }

  return createdUsers;
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

    // Create roles first
    console.log("Creating roles...");
    const { adminRole } = await createRoles();

    // Create admin users and assign roles
    console.log("Creating admin users...");
    const users = await createAdminUsers(adminRole.id);
    const primaryAdmin = users[0]; // Use first admin for product ownership

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
              id: primaryAdmin.id,
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
