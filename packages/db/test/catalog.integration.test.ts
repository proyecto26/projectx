/**
 * Upgrades a database that has the old demo products, with orders and
 * manufacturer prices pointing to them, and seeds the 3D catalog twice.
 *
 * Needs a running Postgres (docker compose up db). It works on its own
 * `<database>_test` database and never writes to the configured one.
 *
 *   POSTGRES_HOST=localhost pnpm --filter @projectx/db test:integration
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { load } from "dotenv-mono";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import "reflect-metadata";
import { type CreateOrderDto, ProductUnavailableError } from "@projectx/models";

import { PrismaClient } from "../generated/prisma/client";
import { LEGACY_SKUS, seedCatalog } from "../prisma/catalog/seed-catalog";
import type { CatalogEntry } from "../prisma/catalog/types";
import { OrderRepositoryService } from "../src/lib/order/order-repository.service";
import type { PrismaService } from "../src/lib/prisma.service";

load();
const root = join(__dirname, "..");
const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl) throw new Error("DATABASE_URL is not set");

const configured = new URL(configuredUrl);
const configuredName = configured.pathname.slice(1);
const testUrl = new URL(configuredUrl);
testUrl.pathname = `/${configuredName}_test`;
const testName = testUrl.pathname.slice(1);
if (!testName.endsWith("_test") || testName === configuredName) {
  throw new Error(`Refusing to run on ${testName}`);
}

const catalog: CatalogEntry[] = JSON.parse(
  readFileSync(join(root, "prisma", "catalog", "catalog.json"), "utf8"),
);
const migrations = join(root, "prisma", "migrations");
const initMigration = "20241023162736_init";

const prisma = (...args: string[]) =>
  execFileSync("pnpm", ["exec", "prisma", ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: "pipe",
  });

async function query<T>(url: string, sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Products in the configured database, which the test must not touch */
async function configuredProducts() {
  const [row] = await query<{ count: string; updated: string | null }>(
    configuredUrl as string,
    'SELECT count(*) AS count, max(updated_at)::text AS updated FROM "product"',
  );
  return row;
}

let before: Awaited<ReturnType<typeof configuredProducts>>;
let pool: Pool;
let client: PrismaClient;
const fixture = {
  ownerId: 0,
  orderId: 0,
  orderItemIds: [] as number[],
  legacyIds: {} as Record<string, number>,
};

beforeAll(async () => {
  before = await configuredProducts();
  const admin = new URL(configuredUrl);
  admin.pathname = "/postgres";
  admin.search = "";
  await query(
    admin.toString(),
    `DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`,
  );
  await query(admin.toString(), `CREATE DATABASE "${testName}"`);

  // The schema as it was before the catalog migration
  const testDb = new URL(testUrl);
  testDb.search = "";
  const init = readFileSync(
    join(migrations, initMigration, "migration.sql"),
    "utf8",
  );
  await query(testDb.toString(), init);
  prisma("migrate", "resolve", "--applied", initMigration);

  // An old installation: the five demo products, an order and a manufacturer price
  const [owner] = await query<{ id: number }>(
    testDb.toString(),
    `INSERT INTO "user" (email, status, updated_at) VALUES ('owner@test.dev', 'Active', now()) RETURNING id`,
  );
  fixture.ownerId = owner.id;
  for (const sku of LEGACY_SKUS) {
    const [product] = await query<{ id: number }>(
      testDb.toString(),
      `INSERT INTO "product" (created_by, name, sku, estimated_price, download_urls, tags, status, updated_at)
       VALUES ($1, $2, $3, 99.99, '{}', '{}', 'Available', now()) RETURNING id`,
      [owner.id, `Legacy ${sku}`, sku],
    );
    fixture.legacyIds[sku] = product.id;
  }
  const [maker] = await query<{ id: number }>(
    testDb.toString(),
    `INSERT INTO "manufacturer" (name, status, "userId", updated_at) VALUES ('Maker', 'Active', $1, now()) RETURNING id`,
    [owner.id],
  );
  const [order] = await query<{ id: number }>(
    testDb.toString(),
    `INSERT INTO "order" (reference_id, user_id, total_price, tax_amount, shipping_cost, status, updated_at)
     VALUES ('legacy-order', $1, 209.98, 0, 10, 'Confirmed', now()) RETURNING id`,
    [owner.id],
  );
  fixture.orderId = order.id;
  for (const sku of ["TECH-001", "AUDIO-001"]) {
    const [item] = await query<{ id: number }>(
      testDb.toString(),
      `INSERT INTO "order_item" (order_id, product_id, manufacturer_id, quantity, price_at_purchase, updated_at)
       VALUES ($1, $2, $3, 1, 99.99, now()) RETURNING id`,
      [order.id, fixture.legacyIds[sku], maker.id],
    );
    fixture.orderItemIds.push(item.id);
  }
  await query(
    testDb.toString(),
    `INSERT INTO "manufacturer_price" (manufacturer_id, product_id, price, updated_at) VALUES ($1, $2, 80, now())`,
    [maker.id, fixture.legacyIds["TECH-001"]],
  );

  // The upgrade
  prisma("migrate", "deploy");
  pool = new Pool({ connectionString: testUrl.toString() });
  client = new PrismaClient({ adapter: new PrismaPg(pool) });
}, 120_000);

afterAll(async () => {
  await client?.$disconnect();
  await pool?.end();
  const admin = new URL(configuredUrl);
  admin.pathname = "/postgres";
  admin.search = "";
  await query(
    admin.toString(),
    `DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`,
  );
});

describe("catalog seed on an existing database", () => {
  it("creates the catalog and discontinues the legacy products", async () => {
    const result = await seedCatalog(client, fixture.ownerId, catalog);
    expect(result).toEqual({
      created: catalog.length,
      updated: 0,
      discontinued: LEGACY_SKUS.length,
    });
    expect(await client.product.count({ where: { status: "Available" } })).toBe(
      catalog.length,
    );
  });

  it("updates in place when it runs again", async () => {
    const result = await seedCatalog(client, fixture.ownerId, catalog);
    expect(result).toEqual({
      created: 0,
      updated: catalog.length,
      discontinued: 0,
    });
    expect(await client.product.count()).toBe(
      catalog.length + LEGACY_SKUS.length,
    );
  });

  it("applies catalog changes on the next run", async () => {
    const [first, ...rest] = catalog;
    const renamed = { ...first, name: `${first.name} (edited)` };
    await seedCatalog(client, fixture.ownerId, [renamed, ...rest]);
    const product = await client.product.findUnique({
      where: { sku: first.sku },
    });
    expect(product?.name).toBe(renamed.name);
    await seedCatalog(client, fixture.ownerId, catalog);
  });

  it("discontinues a product removed from the catalog, and restores it", async () => {
    const removed = catalog[catalog.length - 1];
    const result = await seedCatalog(
      client,
      fixture.ownerId,
      catalog.slice(0, -1),
    );
    expect(result.discontinued).toBe(1);
    const before = await client.product.findUnique({
      where: { sku: removed.sku },
      select: { id: true, status: true },
    });
    expect(before?.status).toBe("Discontinued");

    await seedCatalog(client, fixture.ownerId, catalog);
    const after = await client.product.findUnique({
      where: { sku: removed.sku },
      select: { id: true, status: true },
    });
    expect(after).toEqual({ id: before?.id, status: "Available" });
  });

  it("keeps the legacy products, their orders and prices", async () => {
    const legacy = await client.product.findMany({
      where: { sku: { in: LEGACY_SKUS } },
      select: { id: true, sku: true, status: true },
    });
    expect(Object.fromEntries(legacy.map((p) => [p.sku, p.id]))).toEqual(
      fixture.legacyIds,
    );
    expect(legacy.every((p) => p.status === "Discontinued")).toBe(true);

    const items = await client.orderItem.findMany({
      where: { orderId: fixture.orderId },
      orderBy: { id: "asc" },
    });
    expect(items.map((item) => item.id)).toEqual(fixture.orderItemIds);
    expect(items.map((item) => item.productId)).toEqual([
      fixture.legacyIds["TECH-001"],
      fixture.legacyIds["AUDIO-001"],
    ]);
    expect(
      await client.manufacturerPrice.count({
        where: { productId: fixture.legacyIds["TECH-001"] },
      }),
    ).toBe(1);
  });

  it("stores the catalog fields", async () => {
    const product = await client.product.findUnique({
      where: { sku: "AT-01" },
    });
    expect(product).toMatchObject({
      license: "CC-BY-4.0",
      formats: ["glb", "stl"],
      credit: expect.stringContaining("Atech"),
    });
    expect(product?.attributes).toMatchObject({ source: "atech" });
  });

  it("leaves the configured database alone", async () => {
    expect(await configuredProducts()).toEqual(before);
  });
});

describe("ordering products that can't be sold", () => {
  const orders = () =>
    new OrderRepositoryService(client as unknown as PrismaService);
  const orderFor = (referenceId: string, productIds: number[]) =>
    ({
      referenceId,
      shippingAddress: "",
      billingAddress: "",
      items: productIds.map((productId) => ({ productId, quantity: 1 })),
    }) as unknown as CreateOrderDto;

  let available: number;
  let unavailable: number;
  beforeAll(async () => {
    const [first, second] = await client.product.findMany({
      where: { status: "Available" },
      orderBy: { id: "asc" },
      take: 2,
      select: { id: true },
    });
    available = first.id;
    unavailable = second.id;
    await client.product.update({
      where: { id: unavailable },
      data: { status: "Unavailable" },
    });
  });

  it("finds missing, unavailable and discontinued products", async () => {
    const discontinued = fixture.legacyIds["TECH-001"];
    const missing = 999_999;
    expect(
      await orders().findUnavailableProductIds([
        available,
        discontinued,
        unavailable,
        missing,
        discontinued,
      ]),
    ).toEqual([discontinued, unavailable, missing]);
  });

  it("refuses a new order and writes nothing", async () => {
    const error = await orders()
      .createOrder(
        fixture.ownerId,
        orderFor("new-order", [available, fixture.legacyIds["AUDIO-001"]]),
      )
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );
    expect(error).toBeInstanceOf(ProductUnavailableError);
    expect((error as ProductUnavailableError).productIds).toEqual([
      fixture.legacyIds["AUDIO-001"],
    ]);
    expect(
      await client.order.count({ where: { referenceId: "new-order" } }),
    ).toBe(0);
  });

  it("still returns an order created before its products were discontinued", async () => {
    // A retried activity after the order row exists must not fail
    const existing = await orders().createOrder(
      fixture.ownerId,
      orderFor("legacy-order", [fixture.legacyIds["TECH-001"]]),
    );
    expect(existing.id).toBe(fixture.orderId);
  });

  it("creates an order with available products", async () => {
    const created = await orders().createOrder(
      fixture.ownerId,
      orderFor("fresh-order", [available]),
    );
    expect(created.referenceId).toBe("fresh-order");
  });
});
