export const mockMarketSnapshot = {
  kse100_index: 112458.32,
  kse100_change: 1245.67,
  kse100_change_pct: 1.12,
  kse30_index: 42156.89,
  total_volume: 485000000,
  total_value_mn: 28450.5,
  advances: 245,
  declines: 108,
  unchanged: 32,
  quotes: [
    { symbol: 'ENGRO', company_name: 'Engro Corporation', sector: 'Chemicals', current_price: 412.50, change: 8.50, change_pct: 2.10, volume: 2450000 },
    { symbol: 'LUCK', company_name: 'Lucky Cement', sector: 'Cement', current_price: 1035.00, change: -12.00, change_pct: -1.15, volume: 1820000 },
    { symbol: 'HBL', company_name: 'Habib Bank', sector: 'Banking', current_price: 185.50, change: 4.20, change_pct: 2.32, volume: 5640000 },
    { symbol: 'OGDC', company_name: 'Oil & Gas Dev.', sector: 'Energy', current_price: 148.60, change: 2.80, change_pct: 1.92, volume: 8920000 },
    { symbol: 'SYS', company_name: 'Systems Ltd', sector: 'Technology', current_price: 552.00, change: 18.00, change_pct: 3.37, volume: 1240000 },
    { symbol: 'PPL', company_name: 'Pakistan Petroleum', sector: 'Energy', current_price: 125.40, change: -1.60, change_pct: -1.26, volume: 4560000 },
    { symbol: 'UBL', company_name: 'United Bank', sector: 'Banking', current_price: 275.80, change: 5.60, change_pct: 2.07, volume: 3210000 },
    { symbol: 'MCB', company_name: 'MCB Bank', sector: 'Banking', current_price: 245.30, change: 3.10, change_pct: 1.28, volume: 2780000 },
    { symbol: 'FFC', company_name: 'Fauji Fertilizer', sector: 'Chemicals', current_price: 189.20, change: -2.40, change_pct: -1.25, volume: 3450000 },
    { symbol: 'PSO', company_name: 'Pakistan State Oil', sector: 'Energy', current_price: 312.60, change: 7.80, change_pct: 2.56, volume: 1890000 },
    { symbol: 'HUBC', company_name: 'Hub Power', sector: 'Power', current_price: 142.80, change: 1.20, change_pct: 0.85, volume: 6780000 },
    { symbol: 'MARI', company_name: 'Mari Petroleum', sector: 'Energy', current_price: 1890.00, change: 42.00, change_pct: 2.27, volume: 890000 },
  ],
};

export const mockTopMovers = {
  gainers: [
    { symbol: 'SYS', change_pct: 3.37, price: 552.00 },
    { symbol: 'PSO', change_pct: 2.56, price: 312.60 },
    { symbol: 'HBL', change_pct: 2.32, price: 185.50 },
    { symbol: 'MARI', change_pct: 2.27, price: 1890.00 },
    { symbol: 'ENGRO', change_pct: 2.10, price: 412.50 },
  ],
  losers: [
    { symbol: 'FFC', change_pct: -1.25, price: 189.20 },
    { symbol: 'PPL', change_pct: -1.26, price: 125.40 },
    { symbol: 'LUCK', change_pct: -1.15, price: 1035.00 },
  ],
};

export const mockIndices = [
  { name: 'KSE-100', value: 112458.32, change: 1245.67, changePct: 1.12 },
  { name: 'KSE-30', value: 42156.89, change: 456.23, changePct: 1.09 },
  { name: 'KMI-30', value: 78234.56, change: -234.12, changePct: -0.30 },
];
