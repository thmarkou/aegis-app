import { appSchema, tableSchema } from '@nozbe/watermelondb';

/** Keep `version` equal to the latest `toVersion` in `migrations.ts`. */
export default appSchema({
  version: 17,
  tables: [
    tableSchema({
      name: 'kits',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'water_reservoir_liters', type: 'number', isOptional: true },
        { name: 'icon_type', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'inventory_pool_items',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'pool_category', type: 'string', isIndexed: true },
        { name: 'unit', type: 'string' },
        { name: 'weight_grams', type: 'number' },
        { name: 'expiry_date', type: 'number', isOptional: true },
        { name: 'calories', type: 'number', isOptional: true },
        { name: 'water_liters_per_unit', type: 'number', isOptional: true },
        { name: 'is_essential', type: 'boolean' },
        { name: 'condition', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'is_waypoint', type: 'boolean' },
        { name: 'battery_type', type: 'string', isOptional: true },
        { name: 'last_charge_at', type: 'number', isOptional: true },
        { name: 'battery_capacity_mah', type: 'number', isOptional: true },
        { name: 'charging_requirements', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'kit_pack_items',
      columns: [
        { name: 'kit_id', type: 'string', isIndexed: true },
        { name: 'pool_item_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'body_weight_kg', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'radios',
      columns: [
        { name: 'model', type: 'string', isIndexed: true },
        { name: 'brand', type: 'string' },
        { name: 'battery_mah', type: 'number' },
        { name: 'weight_grams', type: 'number' },
        { name: 'is_primary', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'item_templates',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'weight_grams', type: 'number' },
        { name: 'expiry_date', type: 'number', isOptional: true },
        { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'message_logs',
      columns: [
        { name: 'message', type: 'string' },
        { name: 'sent_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'incoming_stations',
      columns: [
        { name: 'callsign', type: 'string', isIndexed: true },
        { name: 'ssid', type: 'number' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'altitude', type: 'number', isOptional: true },
        { name: 'last_seen_at', type: 'number' },
        { name: 'comment', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'power_devices',
      columns: [
        { name: 'slug', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'last_full_charge_at', type: 'number', isOptional: true },
        { name: 'battery_type', type: 'string', isOptional: true },
        { name: 'maintenance_cycle_days', type: 'number', isOptional: true },
        { name: 'pool_item_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'repeaters',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'callsign', type: 'string', isOptional: true },
        { name: 'location_name', type: 'string', isOptional: true },
        { name: 'frequency', type: 'number' },
        { name: 'offset', type: 'number' },
        { name: 'tone', type: 'number', isOptional: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'type', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'mission_presets',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'duration_days', type: 'number' },
        { name: 'calories_per_day', type: 'number' },
        { name: 'water_liters_per_day', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
