import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import type KitPackItem from './KitPackItem';

export default class Kit extends Model {
  static table = 'kits';

  static associations = {
    kit_pack_items: { type: 'has_many' as const, foreignKey: 'kit_id' },
  };

  @field('name') name!: string;
  @field('description') description!: string | null;
  @field('water_reservoir_liters') waterReservoirLiters!: number | null;
  @field('icon_type') iconType!: string | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('kit_pack_items') packItems!: Query<KitPackItem>;
}
