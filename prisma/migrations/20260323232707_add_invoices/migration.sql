-- CreateTable
CREATE TABLE "Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drawerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "invoiceNum" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL DEFAULT 0,
    "employeeName" TEXT NOT NULL DEFAULT '',
    "barcodes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "DailyDrawer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
