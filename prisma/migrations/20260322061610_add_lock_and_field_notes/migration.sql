-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyDrawer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branchId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "balanceValue" REAL NOT NULL DEFAULT 0,
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
    "fieldNotes" TEXT NOT NULL DEFAULT '{}',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyDrawer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DailyDrawer" ("actualBalance", "adminWithdrawals", "balanceValue", "bookBalance", "boxesBags", "branchId", "cashPurchases", "createdAt", "customerDepositsIn", "customerDepositsOut", "date", "earnestReceived", "id", "notes", "previousEarnest", "returns", "salariesAdvances", "staffDeposits", "storeExpenses", "totalSales", "updatedAt", "yesterdayBalance") SELECT "actualBalance", "adminWithdrawals", "balanceValue", "bookBalance", "boxesBags", "branchId", "cashPurchases", "createdAt", "customerDepositsIn", "customerDepositsOut", "date", "earnestReceived", "id", "notes", "previousEarnest", "returns", "salariesAdvances", "staffDeposits", "storeExpenses", "totalSales", "updatedAt", "yesterdayBalance" FROM "DailyDrawer";
DROP TABLE "DailyDrawer";
ALTER TABLE "new_DailyDrawer" RENAME TO "DailyDrawer";
CREATE UNIQUE INDEX "DailyDrawer_branchId_date_key" ON "DailyDrawer"("branchId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
