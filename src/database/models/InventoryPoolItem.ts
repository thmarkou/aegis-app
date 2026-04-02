import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import type KitPackItem from './KitPackItem';

export default class InventoryPoolItem extends Model {
  static table = 'inventory_pool_items';

  static associations = {
    kit_pack_items: { type: 'has_many' as const, foreignKey: 'pool_item_id' },
  };

  @field('name') name!: string;
  @field('pool_category') poolCategory!: string;
  @field('unit') unit!: string;
  @field('weight_grams') weightGrams!: number;
  @field('expiry_date') expiryDate!: number | null;
  @field('calories') calories!: number | null;
  @field('water_liters_per_unit') waterLitersPerUnit!: number | null;
  @field('is_essential') isEssential!: boolean;
  @field('condition') condition!: string | null;
  @field('notes') notes!: string | null;
  @field('barcode') barcode!: string | null;
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;
  @field('is_waypoint') isWaypoint!: boolean;
  @field('battery_type') batteryType!: string | null;
  @field('last_charge_at') lastChargeAt!: number | null;
  @field('battery_capacity_mah') batteryCapacityMah!: number | null;
  @field('charging_requirements') chargingRequirements!: string | null;
  @field('maintenance_cycle_days') maintenanceCycleDays!: number | null;
  @field('alert_lead_days') alertLeadDays!: number | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('kit_pack_items') packs!: Query<KitPackItem>;
}
