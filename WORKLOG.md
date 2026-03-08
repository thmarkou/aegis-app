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

## 2026-03-08 (Σάββατο) – Phase 1: Profiles & Inventory Enhancements

### Database
- **Migration v1→v2**: `profiles` table (name, body_weight_kg, created_at, updated_at)
- **Migration**: `inventory_items` + `notes` column (string, optional)
- **Profile model** (`src/database/models/Profile.ts`)
- Profile registered in Database

### Profile UI
- **ProfileScreen**: List, Add (FAB), Edit (tap), Delete (long-press)
- **ProfileFormScreen**: name, body_weight_kg
- Profiles stack: Profiles → ProfileForm

### KitDetailScreen
- **Weight warning**: `useWeightWarning` με body_weight_kg από πρώτο profile, weightPercent από settings
- **Edit kit**: headerRight pencil → KitFormScreen (name, description)

### ItemFormScreen
- **notes**: multiline TextInput
- **is_essential**: Switch (tactical theme)
- **calories**: numeric input

### Styling
- Tactical OLED Black & Amber για όλα τα νέα components

### Git
- Commit & push Phase 1 στο GitHub (aaf7429)

### Επόμενο (Phase 2)
- Dashboard: Survival Readiness Score
- Comms: Radios CRUD, Antenna Calculator, SOS
- Map: Repeaters CRUD, χάρτης, Bearing Arrow

---

## 2026-03-09 (Κυριακή) – Phase 2: Radio Officer & Digital Modes

### Phase 2a & 2b – APRS & Comms UI
- **expo-location**: εγκατάσταση, plugin στο app.json, permissions
- **SecureStore**: `secureSettings.ts` – `getCallsign`, `setCallsign`, `getSsid`, `setSsid` (defaults: SY2EYH, 7)
- **SettingsScreen**: APRS/Radio section – Callsign, SSID
- **CommsScreen**: Status bar (LINK: VOX/ANALOG, LINK: DIGITAL, DISTRESS MODE), SEND BEACON, RADIO SMS, DISTRESS MODE (auto-beacon 5 min)
- **AprsService**: `buildPositionPacket()`, `buildSmsgtePacket()` – APRS format

### Phase 2c – Audio Engine & AFSK
- **AudioEngine.ts**: Bell 202 AFSK (Mark 1200Hz, Space 2200Hz, 1200 baud)
- `stringToBits()` – 8N1 serial encoding
- `generateAFSKWav()` – PCM WAV με PTT delay 500ms, post delay 100ms, amplitude 85%
- `playAFSKPacket()` – expo-av playback, DoNotMix audio mode
- **WaveformVisualizer**: animated bars κατά τη μετάδοση
- **AudioRoutingService**: placeholder για USB detection (expo-av δεν έχει getAudioOutputsAsync)
- Integration: SEND BEACON & RADIO SMS → AFSK playback

### iOS Build
- Prebuild με expo-location, expo-av (ExpoLocation, EXAV pods)
- `ios.disableNotifications: true` – Personal Team (χωρίς Push entitlement)
- `ios:release` script – build χωρίς Metro

### Git
- Commit & push Phase 2 στο GitHub (2026-03-09)

---

## Template για νέες ημέρες

```markdown
## YYYY-MM-DD (Ημέρα)

### Εργασία 1
- Περιγραφή

### Εργασία 2
- Περιγραφή
```
