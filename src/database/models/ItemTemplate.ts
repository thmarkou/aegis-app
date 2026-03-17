import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class ItemTemplate extends Model {
  static table = 'item_templates';

  @field('name') name!: string;
  @field('category') category!: string;
  @field('weight_grams') weightGrams!: number;
  @field('expiry_date') expiryDate!: number | null;
  @field('barcode') barcode!: string | null;
}
