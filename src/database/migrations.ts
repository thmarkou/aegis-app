import {
  schemaMigrations,
  createTable,
  addColumns,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

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
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'item_templates',
          columns: [{ name: 'barcode', type: 'string', isOptional: true, isIndexed: true }],
        }),
      ],
    },
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'inventory_items',
          columns: [{ name: 'barcode', type: 'string', isOptional: true, isIndexed: true }],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        createTable({
          name: 'power_devices',
          columns: [
            { name: 'slug', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'last_full_charge_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 13,
      steps: [
        createTable({
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
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'kit_pack_items',
          columns: [
            { name: 'kit_id', type: 'string', isIndexed: true },
            { name: 'pool_item_id', type: 'string', isIndexed: true },
            { name: 'quantity', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        unsafeExecuteSql(
          `INSERT INTO inventory_pool_items (
            id, name, pool_category, unit, weight_grams, expiry_date, calories, water_liters_per_unit,
            is_essential, condition, notes, barcode, latitude, longitude, is_waypoint, created_at, updated_at
          )
          SELECT
            id,
            name,
            CASE
              WHEN LOWER(category) IN ('food', 'water') THEN 'consumables'
              WHEN LOWER(category) = 'medical' THEN 'medical'
              WHEN LOWER(category) = 'radio' THEN 'comms_nav'
              WHEN LOWER(category) IN ('vehicle', 'base camp') THEN 'shelter_clothing'
              ELSE 'tools'
            END,
            unit,
            weight_grams,
            expiry_date,
            calories,
            CASE
              WHEN LOWER(category) = 'water' OR LOWER(name) LIKE '%water%' OR LOWER(name) LIKE '%1l%' THEN 1.0
              ELSE NULL
            END,
            is_essential,
            condition,
            notes,
            barcode,
            latitude,
            longitude,
            CASE WHEN LOWER(category) IN ('base camp', 'vehicle') THEN 1 ELSE 0 END,
            created_at,
            updated_at
          FROM inventory_items`
        ),
        unsafeExecuteSql(
          `INSERT INTO kit_pack_items (id, kit_id, pool_item_id, quantity, created_at, updated_at)
          SELECT id || '_kpack', kit_id, id, quantity, created_at, updated_at FROM inventory_items`
        ),
        unsafeExecuteSql('DROP TABLE inventory_items'),
      ],
    },
    {
      toVersion: 14,
      steps: [
        // WatermelonDB: use `createTable` (there is no `addTable` helper).
        createTable({
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
    },
    {
      // Recovery: some installs reached schema v14 without this table (e.g. mismatch during dev).
      // Matches Watermelon encodeCreateTable + indices for mission_presets.
      toVersion: 15,
      steps: [
        unsafeExecuteSql(
          'create table if not exists "mission_presets" ("id" primary key, "_changed", "_status", "name", "duration_days", "calories_per_day", "water_liters_per_day", "created_at", "updated_at");'
        ),
        unsafeExecuteSql(
          'create index if not exists "mission_presets_name" on "mission_presets" ("name");'
        ),
        unsafeExecuteSql(
          'create index if not exists "mission_presets__status" on "mission_presets" ("_status");'
        ),
      ],
    },
    {
      toVersion: 16,
      steps: [
        addColumns({
          table: 'power_devices',
          columns: [
            { name: 'battery_type', type: 'string', isOptional: true },
            { name: 'maintenance_cycle_days', type: 'number', isOptional: true },
            { name: 'pool_item_id', type: 'string', isOptional: true },
          ],
        }),
        unsafeExecuteSql(
          'UPDATE power_devices SET maintenance_cycle_days = 90 WHERE maintenance_cycle_days IS NULL;'
        ),
        unsafeExecuteSql(
          'CREATE INDEX IF NOT EXISTS power_devices_pool_item_id ON power_devices (pool_item_id);'
        ),
        unsafeExecuteSql(
          `DELETE FROM power_devices WHERE slug IN ('uv_k5', 'main_power_bank');`
        ),
      ],
    },
    {
      toVersion: 17,
      steps: [
        addColumns({
          table: 'inventory_pool_items',
          columns: [
            { name: 'battery_type', type: 'string', isOptional: true },
            { name: 'last_charge_at', type: 'number', isOptional: true },
            { name: 'battery_capacity_mah', type: 'number', isOptional: true },
            { name: 'charging_requirements', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      // One-time wipe: inventory pool, pack lines, logistics devices, kits, blueprints.
      // App then `ensurePatrolPackKit()` creates a single empty "35L Patrol Pack".
      toVersion: 18,
      steps: [
        unsafeExecuteSql('DELETE FROM kit_pack_items;'),
        unsafeExecuteSql('DELETE FROM inventory_pool_items;'),
        unsafeExecuteSql('DELETE FROM power_devices;'),
        unsafeExecuteSql('DELETE FROM item_templates;'),
        unsafeExecuteSql('DELETE FROM kits;'),
      ],
    },
    {
      toVersion: 19,
      steps: [unsafeExecuteSql('DROP TABLE IF EXISTS item_templates;')],
    },
    {
      // Unify Logistics with Warehouse: battery + maintenance live on `inventory_pool_items` only.
      toVersion: 20,
      steps: [
        addColumns({
          table: 'inventory_pool_items',
          columns: [{ name: 'maintenance_cycle_days', type: 'number', isOptional: true }],
        }),
        unsafeExecuteSql(
          `UPDATE inventory_pool_items SET
            maintenance_cycle_days = COALESCE(
              (SELECT p.maintenance_cycle_days FROM power_devices p WHERE p.pool_item_id = inventory_pool_items.id),
              maintenance_cycle_days
            ),
            last_charge_at = COALESCE(
              (SELECT p.last_full_charge_at FROM power_devices p WHERE p.pool_item_id = inventory_pool_items.id),
              last_charge_at
            ),
            battery_type = CASE
              WHEN battery_type IS NULL OR battery_type = '' THEN
                (SELECT p.battery_type FROM power_devices p WHERE p.pool_item_id = inventory_pool_items.id)
              ELSE battery_type
            END
          WHERE id IN (SELECT pool_item_id FROM power_devices WHERE pool_item_id IS NOT NULL);`
        ),
        unsafeExecuteSql(
          `INSERT INTO inventory_pool_items (
            id, _changed, _status,
            name, pool_category, unit, weight_grams,
            expiry_date, calories, water_liters_per_unit, is_essential, condition, notes, barcode, latitude, longitude, is_waypoint,
            battery_type, last_charge_at, battery_capacity_mah, charging_requirements, maintenance_cycle_days,
            created_at, updated_at
          )
          SELECT
            lower(hex(randomblob(16))),
            0,
            '',
            name,
            'power',
            'pcs',
            0,
            NULL, NULL, NULL,
            0,
            NULL, NULL, NULL, NULL, NULL,
            0,
            battery_type,
            last_full_charge_at,
            NULL, NULL,
            COALESCE(maintenance_cycle_days, 90),
            created_at,
            updated_at
          FROM power_devices
          WHERE pool_item_id IS NULL;`
        ),
        unsafeExecuteSql('DROP TABLE IF EXISTS power_devices;'),
      ],
    },
    {
      toVersion: 21,
      steps: [
        addColumns({
          table: 'inventory_pool_items',
          columns: [{ name: 'alert_lead_days', type: 'number', isOptional: true }],
        }),
      ],
    },
  ],
});
