/**
 * Removes aps-environment from iOS entitlements after prebuild.
 * Run after: npx expo prebuild --platform ios
 * Personal Team does not support Push Notifications.
 */
const path = require('path');
const fs = require('fs');

const ENTITLEMENTS = path.join(__dirname, '../ios/AEGIS/AEGIS.entitlements');

if (!fs.existsSync(ENTITLEMENTS)) {
  console.log('No entitlements file, skipping');
  process.exit(0);
}

let content = fs.readFileSync(ENTITLEMENTS, 'utf8');
const before = content;

// Remove aps-environment key and its string value
content = content.replace(/\s*<key>aps-environment<\/key>\s*<string>[^<]*<\/string>\s*/g, '');
content = content.replace(/\s*<key>aps-environment<\/key>\s*<dict\/>\s*/g, '');

if (content !== before) {
  fs.writeFileSync(ENTITLEMENTS, content);
  console.log('Removed aps-environment from AEGIS.entitlements');
}
