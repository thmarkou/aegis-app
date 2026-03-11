import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Maps inventory category + name to Ionicons icon for map waypoints. */
export function getCategoryIcon(category: string, name: string): IoniconName {
  const n = name.toLowerCase();
  if (n.includes('vehicle') || n.includes('car') || n.includes('truck')) return 'car';
  if (n.includes('base camp') || n.includes('camp') || n.includes('tent')) return 'home';
  if (n.includes('cache') || n.includes('supply')) return 'cube';
  switch (category) {
    case 'Food': return 'restaurant';
    case 'Water': return 'water';
    case 'Medical': return 'medkit';
    case 'Radio': return 'radio';
    case 'Vehicle': return 'car';
    case 'Base Camp': return 'home';
    case 'Gear':
    default: return 'cube';
  }
}
