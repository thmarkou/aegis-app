import type { InventoryItem } from '../../../shared/types';

export function getTotalWeightGrams(items: InventoryItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);
}
