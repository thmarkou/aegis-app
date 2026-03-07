import { Q } from '@nozbe/watermelondb';
import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import type InventoryItem from './InventoryItem';

export default class Kit extends Model {
  static table = 'kits';

  static associations = {
    inventory_items: { type: 'has_many' as const, foreignKey: 'kit_id' },
  };

  @field('name') name!: string;
  @field('description') description!: string | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('inventory_items') items!: Query<InventoryItem>;
}
