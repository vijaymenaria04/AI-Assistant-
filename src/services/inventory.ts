import type { InventoryItem } from '../types/database';

// Legacy records without this flag keep their original threshold behaviour.
export const isLowStock = (item: InventoryItem): boolean =>
  item.reorderAlertEnabled !== false && item.stockQuantity <= item.minStockLevel;
