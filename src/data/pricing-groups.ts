/**
 * A/B Testing Price Groups
 * 10 different price combinations for membership and lifetime purchase
 */

export interface PriceGroup {
  id: string;
  membership: {
    monthly: number;
    currency: string;
  };
  lifetime: {
    price: number;
    currency: string;
  };
}

export const PRICING_GROUPS: PriceGroup[] = [
  {
    id: "2ji7jtkf",
    membership: { monthly: 5, currency: "USD" },
    lifetime: { price: 25, currency: "USD" },
  },
  {
    id: "8k3m9pqr",
    membership: { monthly: 7, currency: "USD" },
    lifetime: { price: 30, currency: "USD" },
  },
  {
    id: "5nw2xhzv",
    membership: { monthly: 9, currency: "USD" },
    lifetime: { price: 35, currency: "USD" },
  },
  {
    id: "7b4c6dgf",
    membership: { monthly: 10, currency: "USD" },
    lifetime: { price: 40, currency: "USD" },
  },
  {
    id: "9p1q8rty",
    membership: { monthly: 12, currency: "USD" },
    lifetime: { price: 45, currency: "USD" },
  },
  {
    id: "3l5m7wsx",
    membership: { monthly: 15, currency: "USD" },
    lifetime: { price: 50, currency: "USD" },
  },
  {
    id: "6h8j2kpz",
    membership: { monthly: 8, currency: "USD" },
    lifetime: { price: 32, currency: "USD" },
  },
  {
    id: "4t9v3bnc",
    membership: { monthly: 6, currency: "USD" },
    lifetime: { price: 25, currency: "USD" },
  },
  {
    id: "1a2s5dfg",
    membership: { monthly: 11, currency: "USD" },
    lifetime: { price: 42, currency: "USD" },
  },
  {
    id: "0z9x4cvb",
    membership: { monthly: 13, currency: "USD" },
    lifetime: { price: 48, currency: "USD" },
  },
];

/**
 * Get a random price group
 */
export function getRandomPriceGroup(): PriceGroup {
  const randomIndex = Math.floor(Math.random() * PRICING_GROUPS.length);
  return PRICING_GROUPS[randomIndex];
}

/**
 * Get price group by ID
 */
export function getPriceGroupById(id: string): PriceGroup | undefined {
  return PRICING_GROUPS.find((group) => group.id === id);
}
