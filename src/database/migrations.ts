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
  ],
});
