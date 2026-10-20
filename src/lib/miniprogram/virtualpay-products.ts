export const MINIPROGRAM_PRODUCTS = [
  {
    productId: 'quota_60',
    name: '60 创作额度',
    credits: 60,
    priceFen: 990,
    priceText: '¥9.90',
  },
  {
    productId: 'quota_200',
    name: '200 创作额度',
    credits: 200,
    priceFen: 2990,
    priceText: '¥29.90',
  },
  {
    productId: 'quota_600',
    name: '600 创作额度',
    credits: 600,
    priceFen: 7990,
    priceText: '¥79.90',
  },
] as const;

export type MiniProgramProductId =
  (typeof MINIPROGRAM_PRODUCTS)[number]['productId'];
