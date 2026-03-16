import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'profiles',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'body_weight_kg', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        addColumns({
          table: 'inventory_items',
          columns: [{ name: 'notes', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'inventory_items',
          columns: [
            { name: 'latitude', type: 'number', isOptional: true },
            { name: 'longitude', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'item_templates',
          columns: [
            { name: 'name', type: 'string', isIndexed: true },
            { name: 'category', type: 'string', isIndexed: true },
            { name: 'weight_grams', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'item_templates',
          columns: [{ name: 'expiry_date', type: 'number', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        createTable({
          name: 'message_logs',
          columns: [
            { name: 'message', type: 'string' },
            { name: 'sent_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'kits',
          columns: [
            { name: 'water_reservoir_liters', type: 'number', isOptional: true },
            { name: 'icon_type', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'inventory_items',
          columns: [{ name: 'condition', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
