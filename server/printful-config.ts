// Printful product catalog for Communities
// Framed prints, mugs, totes, iPhone cases

export interface ProductConfig {
  key: string;
  name: string;
  printfulProductId: number;
  variants: Array<{
    id: number;
    name: string;
    retailPriceCents: number;
    wholesaleCostCents: number;
  }>;
  fileType: string;
  fileWidth: number;
  fileHeight: number;
}

export const PRODUCTS: Record<string, ProductConfig> = {
  "framed-print-8x10-black": {
    key: "framed-print-8x10-black",
    name: "Framed Print 8x10 (Black)",
    printfulProductId: 1,
    variants: [{ id: 1, name: "8x10 Black Frame", retailPriceCents: 4999, wholesaleCostCents: 1800 }],
    fileType: "default", fileWidth: 2400, fileHeight: 3000,
  },
  "framed-print-11x14-black": {
    key: "framed-print-11x14-black",
    name: "Framed Print 11x14 (Black)",
    printfulProductId: 1,
    variants: [{ id: 2, name: "11x14 Black Frame", retailPriceCents: 6999, wholesaleCostCents: 2500 }],
    fileType: "default", fileWidth: 3300, fileHeight: 4200,
  },
  "framed-print-16x20-black": {
    key: "framed-print-16x20-black",
    name: "Framed Print 16x20 (Black)",
    printfulProductId: 1,
    variants: [{ id: 3, name: "16x20 Black Frame", retailPriceCents: 8999, wholesaleCostCents: 3500 }],
    fileType: "default", fileWidth: 4800, fileHeight: 6000,
  },
  "mug-11oz": {
    key: "mug-11oz",
    name: "Ceramic Mug 11oz",
    printfulProductId: 19,
    variants: [{ id: 1320, name: "11oz White Mug", retailPriceCents: 2499, wholesaleCostCents: 800 }],
    fileType: "default", fileWidth: 2475, fileHeight: 1050,
  },
  "mug-15oz": {
    key: "mug-15oz",
    name: "Ceramic Mug 15oz",
    printfulProductId: 19,
    variants: [{ id: 4830, name: "15oz White Mug", retailPriceCents: 2999, wholesaleCostCents: 1000 }],
    fileType: "default", fileWidth: 2475, fileHeight: 1140,
  },
  "tote-bag": {
    key: "tote-bag",
    name: "Canvas Tote Bag",
    printfulProductId: 84,
    variants: [{ id: 4533, name: "Natural Canvas Tote", retailPriceCents: 2999, wholesaleCostCents: 1200 }],
    fileType: "default", fileWidth: 2550, fileHeight: 2475,
  },
  "iphone-case": {
    key: "iphone-case",
    name: "iPhone Case",
    printfulProductId: 175,
    variants: [
      { id: 10159, name: "iPhone 15", retailPriceCents: 2499, wholesaleCostCents: 900 },
      { id: 10160, name: "iPhone 15 Pro", retailPriceCents: 2499, wholesaleCostCents: 900 },
      { id: 10161, name: "iPhone 15 Pro Max", retailPriceCents: 2499, wholesaleCostCents: 900 },
    ],
    fileType: "default", fileWidth: 1200, fileHeight: 2000,
  },
};

export function getProduct(key: string): ProductConfig | undefined {
  return PRODUCTS[key];
}

export function getAllProducts(): ProductConfig[] {
  return Object.values(PRODUCTS);
}
