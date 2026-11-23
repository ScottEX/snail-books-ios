export const homeSearchTabs = {
  revenueEntry: 'list',
  statistics: 'chart',
  expenseEntry: 'expense',
  refund: 'expense',
  reconciliationEntry: 'expense',
  fee: 'expense',
  feeHistory: 'expense',
  feeEntry: 'expense',
  newOrder: 'supply',
  procurementHistory: 'supply',
  products: 'supply',
  addProduct: 'supply',
  procurementCart: 'supply',
  partnerStructure: 'partner',
  issueDividend: 'partner',
  dividendHistory: 'partner',
  themeSettings: null,
  logout: null,
} as const;

export type HomeSearchAction = keyof typeof homeSearchTabs;
export type HomeSearchRequest = { action: HomeSearchAction };

export function isHomeSearchAction(id: string): id is HomeSearchAction {
  return Object.prototype.hasOwnProperty.call(homeSearchTabs, id);
}
