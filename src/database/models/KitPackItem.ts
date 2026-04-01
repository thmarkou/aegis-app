import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import type Kit from './Kit';
import type InventoryPoolItem from './InventoryPoolItem';

export default class KitPackItem extends Model {
  static table = 'kit_pack_items';

  static associations = {
    kits: { type: 'belongs_to' as const, key: 'kit_id' },
    inventory_pool_items: { type: 'belongs_to' as const, key: 'pool_item_id' },
  };

  @field('kit_id') kitId!: string;
  @field('pool_item_id') poolItemId!: string;
  @field('quantity') quantity!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('kits', 'kit_id') kit!: Relation<Kit>;
  @relation('inventory_pool_items', 'pool_item_id') poolItem!: Relation<InventoryPoolItem>;
}
