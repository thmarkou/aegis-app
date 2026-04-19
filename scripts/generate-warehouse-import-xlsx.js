/**
 * Generates .xlsx copies of the warehouse CSV templates (UTF-8) for Excel users.
 * Run: node scripts/generate-warehouse-import-xlsx.js
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DIR = path.join(__dirname, '../assets/import-templates');
const FILES = [
  'aegis_tools_template.csv',
  'aegis_general_template.csv',
  'aegis_food_water_template.csv',
  'aegis_battery_template.csv',
];

for (const csvName of FILES) {
  const csvPath = path.join(DIR, csvName);
  const csv = fs.readFileSync(csvPath, 'utf8');
  const wb = XLSX.read(csv, { type: 'string', raw: false, FS: ',', strip: false });
  const outName = csvName.replace(/\.csv$/i, '.xlsx');
  const outPath = path.join(DIR, outName);
  XLSX.writeFile(wb, outPath, { bookType: 'xlsx', compression: true });
  console.log('Wrote', outPath);
}
