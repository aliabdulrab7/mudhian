/**
 * Demo Data Seed Script — يومية المضيان للمجوهرات
 * Run: npx tsx prisma/seed-demo.ts
 *
 * Seeds: MetalPrice, Customer, JewelryItem, Sale, SaleItem, Repair, RepairStatusLog
 */

import * as dotenv from "dotenv";
dotenv.config();

// DigitalOcean managed PostgreSQL uses a self-signed CA — allow it for this seed script.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrisma() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const prisma = createPrisma();

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function invoiceNum(seq: number): string {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${String(seq).padStart(4, "0")}`;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  بدء تهيئة البيانات التجريبية...\n");

  // ── 0. Check which branches exist ──────────────────────────────────────────
  const branches = await prisma.branch.findMany({ select: { id: true } });
  if (branches.length === 0) {
    throw new Error(
      "لا توجد فروع في قاعدة البيانات. أنشئ فرعًا واحدًا على الأقل أولًا ثم أعد التشغيل."
    );
  }
  const branch1 = branches[0].id;
  const branch2 = branches.length >= 2 ? branches[1].id : branch1;
  console.log(`  الفرع 1: ${branch1}  |  الفرع 2: ${branch2}`);

  // ── 0b. Get admin user (setBy) ──────────────────────────────────────────────
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });
  if (!adminUser) {
    throw new Error("لم يُعثر على مستخدم admin. شغّل /api/seed أولًا.");
  }
  const adminId = adminUser.id;
  console.log(`  مستخدم admin: ${adminId}\n`);

  // ── 1. MetalPrice ───────────────────────────────────────────────────────────
  console.log("⚡  أسعار المعادن...");
  const goldPrices = [242.5, 243.0, 241.8, 244.5, 243.75, 240.9, 245.0];
  const silverPrices = [3.25, 3.5, 3.75];

  for (let i = 0; i < 7; i++) {
    await prisma.metalPrice.upsert({
      where: { date_metalType: { date: daysAgo(6 - i), metalType: "gold" } },
      update: { pricePerGram: goldPrices[i] },
      create: {
        date: daysAgo(6 - i),
        metalType: "gold",
        pricePerGram: goldPrices[i],
        setBy: adminId,
      },
    });
  }
  for (let i = 0; i < 3; i++) {
    await prisma.metalPrice.upsert({
      where: { date_metalType: { date: daysAgo(2 - i), metalType: "silver" } },
      update: { pricePerGram: silverPrices[i] },
      create: {
        date: daysAgo(2 - i),
        metalType: "silver",
        pricePerGram: silverPrices[i],
        setBy: adminId,
      },
    });
  }
  console.log("  ✓ 7 أسعار ذهب + 3 أسعار فضة\n");

  // ── 2. Customers ────────────────────────────────────────────────────────────
  console.log("👥  العملاء...");
  const customerData = [
    { name: "محمد العمري", phone: "0512345678" },
    { name: "سارة القحطاني", phone: "0523456789" },
    { name: "أحمد الزهراني", phone: "0534567890" },
    { name: "نورة السبيعي", phone: "0545678901" },
    { name: "خالد المالكي", phone: "0556789012" },
    { name: "فاطمة الغامدي", phone: "0567890123" },
    { name: "عبدالله الشهري", phone: "0578901234" },
    { name: "ريم الدوسري", phone: "0589012345" },
  ];

  const customers: { id: number; name: string }[] = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (existing) {
      customers.push(existing);
      console.log(`  ← موجود: ${c.name}`);
    } else {
      const created = await prisma.customer.create({ data: c });
      customers.push(created);
      console.log(`  + ${c.name}`);
    }
  }
  console.log(`  ✓ ${customers.length} عميل\n`);

  // ── 3. JewelryItem (20 items) ───────────────────────────────────────────────
  console.log("💍  المخزون...");

  interface ItemDef {
    sku: string;
    barcode: string;
    category: string;
    metalType: string;
    karat: number;
    netWeight: number;
    makingCharges: number;
    status: string;
    branchId: number;
    notes?: string;
  }

  const goldRate = 242.5; // used for price calculations

  function buildItem(
    def: ItemDef
  ): ItemDef & { salePrice: number; cost: number; grossWeight: number; margin: number } {
    const metalValue = def.netWeight * goldRate * (def.karat / 24);
    const salePrice = Math.round(metalValue + def.makingCharges + 50);
    const cost = Math.round(salePrice * 0.72);
    const margin = salePrice - cost;
    return {
      ...def,
      grossWeight: +(def.netWeight * 1.05).toFixed(2),
      salePrice,
      cost,
      margin,
    };
  }

  const itemDefs: ItemDef[] = [
    // خواتم (RNG)
    { sku: "RNG0001", barcode: "RNG0001", category: "خاتم", metalType: "gold", karat: 21, netWeight: 3.2, makingCharges: 120, status: "available", branchId: branch1 },
    { sku: "RNG0002", barcode: "RNG0002", category: "خاتم", metalType: "gold", karat: 18, netWeight: 4.5, makingCharges: 90, status: "available", branchId: branch2 },
    { sku: "RNG0003", barcode: "RNG0003", category: "خاتم", metalType: "gold", karat: 22, netWeight: 2.8, makingCharges: 140, status: "sold", branchId: branch1 },
    { sku: "RNG0004", barcode: "RNG0004", category: "خاتم", metalType: "gold", karat: 21, netWeight: 5.1, makingCharges: 110, status: "available", branchId: branch2 },
    // أساور (BRL)
    { sku: "BRL0001", barcode: "BRL0001", category: "سواره", metalType: "gold", karat: 21, netWeight: 8.4, makingCharges: 200, status: "available", branchId: branch1 },
    { sku: "BRL0002", barcode: "BRL0002", category: "سواره", metalType: "gold", karat: 18, netWeight: 6.2, makingCharges: 170, status: "sold", branchId: branch2 },
    { sku: "BRL0003", barcode: "BRL0003", category: "سواره", metalType: "silver", karat: 21, netWeight: 12.5, makingCharges: 80, status: "available", branchId: branch1, notes: "فضة إيطالية" },
    // عقود (NKL)
    { sku: "NKL0001", barcode: "NKL0001", category: "عقد", metalType: "gold", karat: 21, netWeight: 10.0, makingCharges: 250, status: "available", branchId: branch2 },
    { sku: "NKL0002", barcode: "NKL0002", category: "عقد", metalType: "gold", karat: 22, netWeight: 14.3, makingCharges: 300, status: "sold", branchId: branch1 },
    { sku: "NKL0003", barcode: "NKL0003", category: "عقد", metalType: "gold", karat: 18, netWeight: 7.8, makingCharges: 220, status: "available", branchId: branch2 },
    // حلق (EAR)
    { sku: "EAR0001", barcode: "EAR0001", category: "حلق", metalType: "gold", karat: 21, netWeight: 2.1, makingCharges: 60, status: "available", branchId: branch1 },
    { sku: "EAR0002", barcode: "EAR0002", category: "حلق", metalType: "gold", karat: 18, netWeight: 3.4, makingCharges: 75, status: "available", branchId: branch2 },
    { sku: "EAR0003", barcode: "EAR0003", category: "حلق", metalType: "gold", karat: 21, netWeight: 4.7, makingCharges: 90, status: "sold", branchId: branch1 },
    { sku: "EAR0004", barcode: "EAR0004", category: "حلق", metalType: "silver", karat: 21, netWeight: 5.0, makingCharges: 50, status: "available", branchId: branch2, notes: "حلق فضة كلاسيك" },
    // طقم (FSET)
    { sku: "FSET0001", barcode: "FSET0001", category: "طقم", metalType: "gold", karat: 21, netWeight: 20.0, makingCharges: 600, status: "available", branchId: branch1 },
    { sku: "FSET0002", barcode: "FSET0002", category: "طقم", metalType: "gold", karat: 22, netWeight: 25.0, makingCharges: 750, status: "available", branchId: branch2 },
    { sku: "FSET0003", barcode: "FSET0003", category: "طقم", metalType: "gold", karat: 21, netWeight: 18.5, makingCharges: 580, status: "available", branchId: branch1 },
    // مزيد من الأصناف لإكمال 20
    { sku: "RNG0005", barcode: "RNG0005", category: "خاتم", metalType: "gold", karat: 21, netWeight: 6.0, makingCharges: 130, status: "available", branchId: branch2 },
    { sku: "BRL0004", barcode: "BRL0004", category: "سواره", metalType: "gold", karat: 21, netWeight: 9.2, makingCharges: 210, status: "archived", branchId: branch1, notes: "قديم — تم أرشفته" },
    { sku: "NKL0004", barcode: "NKL0004", category: "عقد", metalType: "gold", karat: 18, netWeight: 11.1, makingCharges: 270, status: "archived", branchId: branch2, notes: "قديم — تم أرشفته" },
  ];

  const createdItems: { id: number; sku: string; salePrice: number; status: string; branchId: number }[] = [];

  for (const def of itemDefs) {
    const item = buildItem(def);
    const existing = await prisma.jewelryItem.findUnique({ where: { sku: item.sku } });
    if (existing) {
      createdItems.push({ id: existing.id, sku: existing.sku, salePrice: existing.salePrice, status: existing.status, branchId: existing.branchId });
      console.log(`  ← موجود: ${item.sku}`);
    } else {
      const created = await prisma.jewelryItem.create({
        data: {
          sku: item.sku,
          barcode: item.barcode,
          category: item.category,
          metalType: item.metalType,
          karat: item.karat,
          grossWeight: item.grossWeight,
          netWeight: item.netWeight,
          makingCharges: item.makingCharges,
          salePrice: item.salePrice,
          cost: item.cost,
          margin: item.margin,
          status: item.status,
          branchId: item.branchId,
          notes: (item as ItemDef).notes ?? "",
          soldAt: item.status === "sold" ? new Date() : null,
        },
      });
      createdItems.push({ id: created.id, sku: created.sku, salePrice: created.salePrice, status: created.status, branchId: created.branchId });
      console.log(`  + ${item.sku}  ${item.category}  ${item.karat}K  ${item.netWeight}g  → ${item.salePrice} ر.س`);
    }
  }
  console.log(`  ✓ ${createdItems.length} قطعة\n`);

  // ── 4. Sales (5 sales using sold items) ────────────────────────────────────
  console.log("🧾  المبيعات...");
  const soldItems = createdItems.filter((i) => i.status === "sold");
  // We have exactly 4 sold items; we'll create 4 single-item sales + 1 multi-item sale
  // (reuse the first two available items for the combo sale — they'll remain "available" status)
  const availableItems = createdItems.filter((i) => i.status === "available");

  const paymentMethods = ["cash", "card", "transfer", "cash", "card"];

  interface SaleDef {
    invoiceNum: string;
    branchId: number;
    customerId: number;
    paymentMethod: string;
    itemIds: number[];
    prices: number[];
  }

  const saleDefs: SaleDef[] = [
    {
      invoiceNum: invoiceNum(1),
      branchId: soldItems[0]?.branchId ?? branch1,
      customerId: customers[0].id,
      paymentMethod: paymentMethods[0],
      itemIds: [soldItems[0]?.id ?? availableItems[0].id],
      prices: [soldItems[0]?.salePrice ?? availableItems[0].salePrice],
    },
    {
      invoiceNum: invoiceNum(2),
      branchId: soldItems[1]?.branchId ?? branch1,
      customerId: customers[1].id,
      paymentMethod: paymentMethods[1],
      itemIds: [soldItems[1]?.id ?? availableItems[1].id],
      prices: [soldItems[1]?.salePrice ?? availableItems[1].salePrice],
    },
    {
      invoiceNum: invoiceNum(3),
      branchId: soldItems[2]?.branchId ?? branch2,
      customerId: customers[2].id,
      paymentMethod: paymentMethods[2],
      itemIds: [soldItems[2]?.id ?? availableItems[2].id],
      prices: [soldItems[2]?.salePrice ?? availableItems[2].salePrice],
    },
    {
      invoiceNum: invoiceNum(4),
      branchId: soldItems[3]?.branchId ?? branch2,
      customerId: customers[3].id,
      paymentMethod: paymentMethods[3],
      itemIds: [soldItems[3]?.id ?? availableItems[3].id],
      prices: [soldItems[3]?.salePrice ?? availableItems[3].salePrice],
    },
    // Multi-item combo sale using two available items
    {
      invoiceNum: invoiceNum(5),
      branchId: availableItems[0]?.branchId ?? branch1,
      customerId: customers[4].id,
      paymentMethod: paymentMethods[4],
      itemIds: [availableItems[0]?.id, availableItems[1]?.id].filter(Boolean) as number[],
      prices: [availableItems[0]?.salePrice ?? 0, availableItems[1]?.salePrice ?? 0],
    },
  ];

  for (const sd of saleDefs) {
    const existing = await prisma.sale.findUnique({ where: { invoiceNum: sd.invoiceNum } });
    if (existing) {
      console.log(`  ← موجود: ${sd.invoiceNum}`);
      continue;
    }
    const totalAmount = sd.prices.reduce((a, b) => a + b, 0);
    const sale = await prisma.sale.create({
      data: {
        invoiceNum: sd.invoiceNum,
        branchId: sd.branchId,
        customerId: sd.customerId,
        totalAmount,
        paymentMethod: sd.paymentMethod,
        createdBy: adminId,
        saleItems: {
          create: sd.itemIds.map((itemId, idx) => ({
            jewelryItemId: itemId,
            price: sd.prices[idx],
            discount: 0,
          })),
        },
      },
    });
    console.log(`  + ${sd.invoiceNum}  ${sd.itemIds.length} بند  ${totalAmount} ر.س  (${sd.paymentMethod})`);
    void sale;
  }
  console.log(`  ✓ 5 فواتير بيع\n`);

  // ── 5. Repairs (6 repairs) ──────────────────────────────────────────────────
  console.log("🔧  الصيانة...");

  interface RepairDef {
    branchId: number;
    customerId: number;
    itemDescription: string;
    receivedCondition: string;
    estimatedCost: number;
    actualCost: number;
    status: string;
    notes: string;
    daysAgoReceived: number;
    statusLogs: { status: string; note: string; daysAgo: number }[];
  }

  const repairDefs: RepairDef[] = [
    {
      branchId: branch1,
      customerId: customers[5].id,
      itemDescription: "خاتم ذهب 21 كيلو — كسر في الحلقة",
      receivedCondition: "كسر بسيط في الجانب الأيسر",
      estimatedCost: 80,
      actualCost: 0,
      status: "received",
      notes: "العميل يطلب التسليم خلال أسبوع",
      daysAgoReceived: 1,
      statusLogs: [
        { status: "received", note: "تم استلام القطعة", daysAgo: 1 },
      ],
    },
    {
      branchId: branch2,
      customerId: customers[6].id,
      itemDescription: "سلسلة ذهب 18 كيلو — إعادة لحام",
      receivedCondition: "انفصال في وصلة منتصف السلسلة",
      estimatedCost: 120,
      actualCost: 0,
      status: "received",
      notes: "",
      daysAgoReceived: 2,
      statusLogs: [
        { status: "received", note: "تم الاستلام والفحص", daysAgo: 2 },
      ],
    },
    {
      branchId: branch1,
      customerId: customers[0].id,
      itemDescription: "طقم ذهب — تنظيف وتلميع",
      receivedCondition: "تراكم أوساخ، لا كسور",
      estimatedCost: 50,
      actualCost: 0,
      status: "in_progress",
      notes: "جاهز خلال يومين",
      daysAgoReceived: 4,
      statusLogs: [
        { status: "received", note: "تم الاستلام", daysAgo: 4 },
        { status: "in_progress", note: "بدأ العمل على التنظيف", daysAgo: 3 },
      ],
    },
    {
      branchId: branch2,
      customerId: customers[2].id,
      itemDescription: "حلق ذهب 21 — تغيير برغي",
      receivedCondition: "برغي مفقود في أحد الحلقين",
      estimatedCost: 40,
      actualCost: 0,
      status: "in_progress",
      notes: "",
      daysAgoReceived: 3,
      statusLogs: [
        { status: "received", note: "استلام القطعة", daysAgo: 3 },
        { status: "in_progress", note: "طلب قطعة بديلة من المورد", daysAgo: 2 },
      ],
    },
    {
      branchId: branch1,
      customerId: customers[3].id,
      itemDescription: "خاتم خطوبة — تغيير مقاس",
      receivedCondition: "المقاس أكبر من اللازم",
      estimatedCost: 90,
      actualCost: 85,
      status: "completed",
      notes: "تم تضييق المقاس بنجاح",
      daysAgoReceived: 7,
      statusLogs: [
        { status: "received", note: "استلام الخاتم", daysAgo: 7 },
        { status: "in_progress", note: "بدأ التعديل", daysAgo: 6 },
        { status: "completed", note: "اكتمل التعديل وجاهز للتسليم", daysAgo: 2 },
      ],
    },
    {
      branchId: branch2,
      customerId: customers[7].id,
      itemDescription: "سوارة فضة — إصلاح قفل",
      receivedCondition: "قفل مكسور",
      estimatedCost: 30,
      actualCost: 30,
      status: "delivered",
      notes: "سُلِّم للعميلة بتاريخ اليوم",
      daysAgoReceived: 10,
      statusLogs: [
        { status: "received", note: "استلام السوارة", daysAgo: 10 },
        { status: "in_progress", note: "بدء الإصلاح", daysAgo: 9 },
        { status: "completed", note: "اكتمل الإصلاح", daysAgo: 5 },
        { status: "delivered", note: "تم التسليم للعميلة وتم الدفع", daysAgo: 0 },
      ],
    },
  ];

  for (const rd of repairDefs) {
    // Check if repair already exists (by itemDescription + customerId combination)
    const existing = await prisma.repair.findFirst({
      where: { itemDescription: rd.itemDescription, customerId: rd.customerId },
    });
    if (existing) {
      console.log(`  ← موجود: ${rd.itemDescription.slice(0, 30)}`);
      continue;
    }

    const receivedAt = daysAgo(rd.daysAgoReceived);
    const deliveredAt = rd.status === "delivered" ? new Date() : undefined;

    const repair = await prisma.repair.create({
      data: {
        branchId: rd.branchId,
        customerId: rd.customerId,
        itemDescription: rd.itemDescription,
        receivedCondition: rd.receivedCondition,
        estimatedCost: rd.estimatedCost,
        actualCost: rd.actualCost,
        status: rd.status,
        notes: rd.notes,
        receivedAt,
        deliveredAt,
      },
    });

    // Create status logs
    for (const log of rd.statusLogs) {
      await prisma.repairStatusLog.create({
        data: {
          repairId: repair.id,
          status: log.status,
          note: log.note,
          changedBy: adminId,
          changedAt: daysAgo(log.daysAgo),
        },
      });
    }

    console.log(`  + [${rd.status}] ${rd.itemDescription.slice(0, 45)}  (${rd.statusLogs.length} سجل)`);
  }
  console.log(`  ✓ 6 طلبات صيانة\n`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("──────────────────────────────────────────────────");
  console.log("✅  تمت تهيئة البيانات التجريبية بنجاح!\n");
  console.log("الملخص:");
  console.log(`  • أسعار المعادن: 10 سجل (7 ذهب + 3 فضة)`);
  console.log(`  • العملاء: ${customers.length}`);
  console.log(`  • قطع المجوهرات: ${createdItems.length}`);
  console.log(`    ─ متاح: ${createdItems.filter((i) => i.status === "available").length}`);
  console.log(`    ─ مباع: ${createdItems.filter((i) => i.status === "sold").length}`);
  console.log(`    ─ مؤرشف: ${createdItems.filter((i) => i.status === "archived").length}`);
  console.log(`  • فواتير البيع: 5`);
  console.log(`  • طلبات الصيانة: 6`);
}

main()
  .catch((e) => {
    console.error("❌  فشلت التهيئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
