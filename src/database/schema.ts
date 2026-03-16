import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 9,
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
      name: 'inventory_items',
      columns: [
        { name: 'kit_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'unit', type: 'string' },
        { name: 'weight_grams', type: 'number' },
        { name: 'expiry_date', type: 'number', isOptional: true },
        { name: 'calories', type: 'number', isOptional: true },
        { name: 'quantity', type: 'number' },
        { name: 'is_essential', type: 'boolean' },
        { name: 'condition', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
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
  ],
});
