import { database } from './index';
import type ItemTemplate from './models/ItemTemplate';

const DEFAULT_TEMPLATES = [
  { name: 'Quansheng UV-K5 (250g)', category: 'Radio', weightGrams: 250 },
  { name: 'MRE (500g)', category: 'Food', weightGrams: 500 },
  { name: 'Water Bottle 1L (1050g)', category: 'Water', weightGrams: 1050 },
  { name: 'First Aid Kit (400g)', category: 'Medical', weightGrams: 400 },
];

export async function seedDefaultItemTemplates(): Promise<void> {
  const templates = database.get<ItemTemplate>('item_templates');
  const existing = await templates.query().fetchCount();
  if (existing > 0) return;

  await database.write(async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await templates.create((r) => {
        r.name = t.name;
        r.category = t.category;
        r.weightGrams = t.weightGrams;
      });
    }
  });
}
