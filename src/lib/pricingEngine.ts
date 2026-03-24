export interface PricingInput {
  netWeight: number;        // grams of metal
  goldPricePerGram: number; // from MetalPrice table
  makingCharges: number;    // labor/craftsmanship
  stoneValue: number;       // value of stones
  margin: number;           // profit margin
}

/**
 * Standard jewelry sale price formula:
 * (goldPricePerGram × netWeight) + makingCharges + stoneValue + margin
 */
export function calculateSalePrice(input: PricingInput): number {
  const { netWeight, goldPricePerGram, makingCharges, stoneValue, margin } = input;
  return goldPricePerGram * netWeight + makingCharges + stoneValue + margin;
}
