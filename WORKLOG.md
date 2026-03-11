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

## 2026-03-10 (Δευτέρα) – Splash, Logo & iOS Provisioning

### Splash Screen
- **expo-splash-screen** plugin στο app.json (image, backgroundColor, imageWidth: 280)
- **splash.png** (1024×1024): νέο τετράγωνο asset από aegis.png
- **generate-splash-images.js**: δημιουργεί splash.png + iOS SplashScreenLogo.imageset (1x, 2x, 3x)
- app.json splash.image → `./assets/images/icons/splash.png`
- Prebuild --clean για iOS

### Logo & Branding
- **LoginScreen**: αντικατάσταση Ionicons shield-checkmark με logo (aegis.png), μέγεθος 180×180
- **TacticalSplashScreen**: logo 200×200, glow ring 260×260
- Icons στο `assets/images/icons/` (aegis.png, splash.png, notification-icon.png)
- Διαγραφή legacy: icon.png, adaptive-icon.png, splash-icon.png

### iOS Provisioning (Personal Team)
- Αφαίρεση **aps-environment** από AEGIS.entitlements (Personal Team δεν υποστηρίζει Push)
- app.json: `ios.entitlements: { "aps-environment": null }`
- withoutPushForPersonalTeam plugin (backup)

### Map
- react-native-maps@1.20.1, tacticalMapStyle, custom marker με callsign

### Git
- Commit & push στο GitHub

---

## 2026-03-06 (Παρασκευή) – UI Layout & Health Integration

### Health Integration Expansion (Apple HealthKit / Garmin Fenix 8)
- **GarminSyncService**: νέα permissions – OxygenSaturation, RestingHeartRate, ActiveEnergyBurned
- Polling κάθε 20s: SpO2 (αίμα οξυγόνου %), RHR (ηρεμιστικός σφυγμός), Active Energy (kcal σήμερα)
- **useGarminStore**: νέα state – spo2, restingHeartRate, activeEnergyKcal
- **BIO-METRICS** section στο Dashboard (στυλ ENV/Telemetry):
  - HR: [τιμή] BPM με heart icon
  - SpO2: [τιμή]% με O₂ icon
  - EFFORT: (HR - RHR) / (MaxHR - RHR) ή HR zone (REST/LIGHT/MODERATE/HARD/MAX)
  - ACTIVE: kcal με flame icon
- **Smart Alerts**: SpO2 < 90% → κόκκινο + αναλαμπή, HR > 160 → "HIGH EXERTION"
- **APRS**: append bio string [HR:72 SpO2:98%] σε Status/SOS packets (buildStatusPacket, buildPositionPacket)
- **Reliability**: -- για missing metrics (χωρίς crash)
- **withHealthKit.js**: ενημερωμένο NSHealthShareUsageDescription

### ItemFormScreen
- **headerLargeTitle: false** – σταθερό header, πλήρης ορατότητα πεδίων (Name, Category κλπ.)
- **contentInsetAdjustmentBehavior="automatic"** – σωστό safe area στο ScrollView

### KitListScreen
- **headerLargeTitle: false** – αποφυγή overlap περιεχομένου με header
- **contentInsetAdjustmentBehavior="automatic"** + **contentContainerStyle** (paddingTop: 16) στο FlatList

### InventoryStack – Header Icons
- Κύκλος 44×44 με `alignItems: 'center'`, `justifyContent: 'center'` για pencil & people icons
- **iconCentered** style: `textAlign: 'center'`, `transform: [{ translateX: -0.5 }, { translateY: -1 }]` – διόρθωση γνωστού Ionicons alignment offset

### Git
- Αλλαγές προς commit & push στο GitHub
- Πρόσφατα commits (αναφορά): `79ff31a` 2026-03-09, `2b08fd0` 2026-03-09, `116a052` 2026-03-08, `aaf7429` 2026-03-08, `3bebc07` 2026-03-07

---

## 2026-03-11 – Phase 3b: Offline Tactical Mapping & Tile Caching

### Map Tile Caching
- **TileCacheService** (`src/features/map/services/TileCacheService.ts`): CartoDB dark tiles, expo-file-system storage
- Download tiles to `{z}/{x}/{y}.png`, 500MB limit, zoom 10–18
- **UrlTile** (online): `tiles.basemaps.cartocdn.com/dark_all`
- **LocalTile** (offline): reads from cached tiles

### Tactical Download
- "Tactical Download" button: 5km radius around GPS, zoom 10–18
- Progress bar με ποσοστό κατά τη λήψη

### Visual Indicators
- **Offline Mode** badge (Amber) όταν δεν υπάρχει internet
- @react-native-community/netinfo για network state

### Tactical Markers
- Location marker (callsign SY2EYH-7) πάνω από tiles (zIndex 10)
- Repeaters από DB ως waypoints (zIndex 5)

### Auto-cache
- onRegionChangeComplete: cache visible region (2km max) μετά από 2s debounce

### Settings
- **Clear Cache** button, εμφάνιση cache size (MB / 500 MB)
- useFocusEffect για refresh όταν ανοίγει το Settings

### Dependencies
- @react-native-community/netinfo

---

## Template για νέες ημέρες

```markdown
## YYYY-MM-DD (Ημέρα)

### Εργασία 1
- Περιγραφή

### Εργασία 2
- Περιγραφή
```
