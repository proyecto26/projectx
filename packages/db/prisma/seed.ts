import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, UserStatus } from "../generated/prisma/client";
import { seedCatalog } from "./catalog/seed-catalog";

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

    console.log("Seeding the 3D catalog...");
    const result = await seedCatalog(prisma, primaryAdmin.id);
    console.log(
      `Catalog: ${result.created} created, ${result.updated} updated, ${result.discontinued} discontinued (legacy or removed from catalog.json)`,
    );

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
