-- CreateTable
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "branchNum" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'branch',
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDrawer" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yesterdayBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earnestReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "staffDeposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerDepositsIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminWithdrawals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousEarnest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boxesBags" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storeExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerDepositsOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returns" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salariesAdvances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '[]',
    "fieldNotes" TEXT NOT NULL DEFAULT '{}',
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldItem" (
    "id" SERIAL NOT NULL,
    "drawerId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SoldItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "drawerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "invoiceNum" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeeName" TEXT NOT NULL DEFAULT '',
    "employeeId" INTEGER,
    "barcodes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" SERIAL NOT NULL,
    "drawerId" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beneficiary" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BankTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryItem" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metalType" TEXT NOT NULL DEFAULT 'gold',
    "karat" INTEGER NOT NULL DEFAULT 18,
    "grossWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stoneType" TEXT NOT NULL DEFAULT '',
    "stoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stoneCount" INTEGER NOT NULL DEFAULT 0,
    "stoneValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'available',
    "branchId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "JewelryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalPrice" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "metalType" TEXT NOT NULL DEFAULT 'gold',
    "pricePerGram" DOUBLE PRECISION NOT NULL,
    "setBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "vatNumber" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "invoiceNum" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "employeeId" INTEGER,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "jewelryItemId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repair" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "employeeId" INTEGER,
    "itemDescription" TEXT NOT NULL,
    "receivedCondition" TEXT NOT NULL DEFAULT '',
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'received',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedReady" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusLog" (
    "id" SERIAL NOT NULL,
    "repairId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDrawer_branchId_date_key" ON "DailyDrawer"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryItem_sku_key" ON "JewelryItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryItem_barcode_key" ON "JewelryItem"("barcode");

-- CreateIndex
CREATE INDEX "JewelryItem_branchId_idx" ON "JewelryItem"("branchId");

-- CreateIndex
CREATE INDEX "JewelryItem_status_idx" ON "JewelryItem"("status");

-- CreateIndex
CREATE INDEX "JewelryItem_category_idx" ON "JewelryItem"("category");

-- CreateIndex
CREATE INDEX "MetalPrice_date_idx" ON "MetalPrice"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MetalPrice_date_metalType_key" ON "MetalPrice"("date", "metalType");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNum_key" ON "Sale"("invoiceNum");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Repair_branchId_idx" ON "Repair"("branchId");

-- CreateIndex
CREATE INDEX "Repair_status_idx" ON "Repair"("status");

-- CreateIndex
CREATE INDEX "RepairStatusLog_repairId_idx" ON "RepairStatusLog"("repairId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDrawer" ADD CONSTRAINT "DailyDrawer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JewelryItem" ADD CONSTRAINT "JewelryItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalPrice" ADD CONSTRAINT "MetalPrice_setBy_fkey" FOREIGN KEY ("setBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_jewelryItemId_fkey" FOREIGN KEY ("jewelryItemId") REFERENCES "JewelryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusLog" ADD CONSTRAINT "RepairStatusLog_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
