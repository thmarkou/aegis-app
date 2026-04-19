AEGIS warehouse CSV import — four templates (UTF-8).

Each template exists as:
  • .csv  — source of truth (UTF-8), matches the app importer exactly
  • .xlsx — same columns and example rows, opens directly in Excel

To import in the app: edit the template, then in Excel use Save As → CSV UTF-8 (comma delimited).
The app’s Import CSV picker reads .csv only, not .xlsx.

Regenerate .xlsx from .csv after editing headers: npm run generate:warehouse-xlsx

1) aegis_tools_template (.csv / .xlsx)
   Category: tools only. No expiry or alert_lead_days columns — gear items do not use dated
   expiry in this app.

2) aegis_general_template (.csv / .xlsx) — Medical & shelter
   Categories: medical | shelter_clothing
   medical: expiry optional (DD-MM-YYYY). alert_lead_days defaults to 14 if blank.
   shelter_clothing: leave expiry and alert_lead_days empty — the app ignores them for this category.
   is_essential: true/false.

3) aegis_food_water_template (.csv / .xlsx)
   Categories: consumables | water
   consumables: use calories (optional). water: use liters_per_unit (optional).
   Leave unused column empty for the other category.

4) aegis_battery_template (.csv / .xlsx)
   Categories: comms_nav | tactical_radios | power_units | power_banks | lighting | power
   last_charge_date required (YYYY-MM-DD for import). In the app UI, last charge shows as MM-DD-YYYY.
   battery_type required.

First row must match the template header exactly.
