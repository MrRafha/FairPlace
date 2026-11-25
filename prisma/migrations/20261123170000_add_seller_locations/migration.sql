-- CreateTable
CREATE TABLE "SellerLocation" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "weekdays" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SellerLocation" ADD CONSTRAINT "SellerLocation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


