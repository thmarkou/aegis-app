# AEGIS – Work Log

Καθημερινή αρχειοθέτηση εργασιών ανά ημερομηνία.

---

## 2026-03-07 (Παρασκευή)

### Database
- Αντικατάσταση expo-sqlite με **WatermelonDB**
- Schema v1: `kits`, `inventory_items`, `radios`, `repeaters`
- Models: Kit, InventoryItem, Radio, Repeater με associations
- Migrations: κενό array (schema version 1)

### UI / Styling
- Απενεργοποίηση **NativeWind** (Metro hang)
- Tactical theme: OLED black (#000000) + Amber (#FFBF00)
- `tacticalStyles.ts` – StyleSheet-based styles
- Μετατροπή οθονών: Login, Pin, KitList, KitDetail, ItemForm, Settings, Profile, Comms, Map, Dashboard

### Navigation
- Bottom Tab Navigator: Dashboard, Inventory, Map, Comms, Settings
- Inventory Stack: KitList → KitDetail → ItemForm, Profiles

### iOS Build
- Αφαίρεση **expo-dev-client** (οθόνη "Development servers")
- Prebuild για Xcode-ready build
- `AppDelegate`: embedded bundle πρώτα (χωρίς Metro)
- `ios/.xcode.env.local`: `unset SKIP_BUNDLING` για Debug bundle
- Αφαίρεση Push Notifications entitlement (Personal Team)
- `AEGIS.entitlements`: αφαίρεση `aps-environment`

### Services
- **expo-secure-store**: PIN, expiry days, weight %
- `secureSettings.ts` – αντικατάσταση AsyncStorage
- `settingsSync` + `expirationNotifications` ενημερωμένα

### Plugins
- `withWatermelonDBSimdjson.js` – simdjson pod
- `withoutPushForPersonalTeam.js` – αφαίρεση aps-environment

### Git
- Commit & push στο GitHub (thmarkou/aegis-app)

---

## Template για νέες ημέρες

```markdown
## YYYY-MM-DD (Ημέρα)

### Εργασία 1
- Περιγραφή

### Εργασία 2
- Περιγραφή
```
