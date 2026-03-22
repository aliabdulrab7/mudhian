-- CreateTable
CREATE TABLE "Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "branchNum" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'branch',
    "branchId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyDrawer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branchId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "yesterdayBalance" REAL NOT NULL DEFAULT 0,
    "earnestReceived" REAL NOT NULL DEFAULT 0,
    "staffDeposits" REAL NOT NULL DEFAULT 0,
    "customerDepositsIn" REAL NOT NULL DEFAULT 0,
    "adminWithdrawals" REAL NOT NULL DEFAULT 0,
    "previousEarnest" REAL NOT NULL DEFAULT 0,
    "boxesBags" REAL NOT NULL DEFAULT 0,
    "cashPurchases" REAL NOT NULL DEFAULT 0,
    "storeExpenses" REAL NOT NULL DEFAULT 0,
    "customerDepositsOut" REAL NOT NULL DEFAULT 0,
    "returns" REAL NOT NULL DEFAULT 0,
    "salariesAdvances" REAL NOT NULL DEFAULT 0,
    "actualBalance" REAL NOT NULL DEFAULT 0,
    "bookBalance" REAL NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyDrawer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SoldItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drawerId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SoldItem_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drawerId" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "beneficiary" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "BankTransfer_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDrawer_branchId_date_key" ON "DailyDrawer"("branchId", "date");
