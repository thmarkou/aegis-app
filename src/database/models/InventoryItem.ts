import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import type Kit from './Kit';

export default class InventoryItem extends Model {
  static table = 'inventory_items';

  static associations = {
    kits: { type: 'belongs_to' as const, key: 'kit_id' },
  };

  @field('kit_id') kitId!: string;
  @field('name') name!: string;
  @field('category') category!: string;
  @field('unit') unit!: string;
  @field('weight_grams') weightGrams!: number;
  @field('expiry_date') expiryDate!: number | null;
  @field('calories') calories!: number | null;
  @field('quantity') quantity!: number;
  @field('is_essential') isEssential!: boolean;
  @field('condition') condition!: string | null;
  @field('notes') notes!: string | null;
  @field('barcode') barcode!: string | null;
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('kits', 'kit_id') kit!: Relation<Kit>;
}
