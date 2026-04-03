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

## 2026-03-06 (Παρασκευή) – UI Layout & Ολοκλήρωση Dashboard

### Κατάσταση
- Dashboard ήταν **υπό κατασκευή** – σήμερα ολοκληρώθηκε

### Dashboard Infrastructure
- **useDashboardData**: readiness score (mission checks + expiry), total weight, battery, exp alerts, next waypoint, location, altitude, steps, dist walked, weather
- **weatherService**: Open-Meteo API (temp, wind) – online only
- **Readiness Gauge**: οπτικό score 0–100%, compromised < 70%
- **Telemetry cards**: PKG_WT, BATT_STAT, EXP_ALERTS, NEXT_WP, ALT, DIST_WALKED
- **ENV section**: temp °C, wind km/h
- **BatteryTelemetry** component, **useBatteryTelemetry** (Power Save Mode < 20%)
- **SettingsStack**: Settings navigation
- **Link Garmin Device** toggle στο Settings

### Health Integration Expansion (Apple HealthKit / Garmin Fenix 8) – ολοκλήρωση σήμερα
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

### Item Templates
- **item_templates** table (schema v6): name, category, weight_grams, expiry_date
- **ItemTemplate** model
- **TemplateListScreen**: λίστα templates, Add (FAB), Edit, Delete
- **TemplateFormScreen**: name, category, weight_grams
- **TemplatePicker** component: επιλογή template κατά το Add item
- **seedDefaultItemTemplates**: default templates (Quansheng UV-K5, MRE, Water Bottle, First Aid Kit)
- **App.tsx**: `seedDefaultItemTemplates()` στο init

### Message Log & Mission Prep
- **message_logs** table: message, sent_at – καταγραφή APRS messages
- **MessageLog** model
- **CommsScreen**: log sent messages στο DB
- **MissionPrepScreen**: pre-flight checklist (Radios Charged, Antenna Tuned, Cables Connected, Offline Maps Verified, Emergency Rations)
- **secureSettings**: getMissionCheck, setMissionCheck – τα checks τροφοδοτούν το Readiness Score στο Dashboard

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

## 2026-03-12 (Πέμπτη) – Emergency System & Audio Calibration Suite

### Emergency System – Ολοκλήρωση
- **EmergencyStationMarker**: μεγάλο κόκκινο διαμάντι (40×40), radar-style pulsing halo (radius 80), bold amber label σε μαύρο background
- **zIndex 999999** για emergency markers – πάνω από όλα τα labels
- **CANCEL EMERGENCY** κουμπί στο Dashboard – εμφανίζεται μόνο όταν `isGlobalEmergency` true
- **cancelEmergencyBroadcast**: set `isGlobalEmergency=false` αμέσως, wipe emergency stations από DB, στέλνει ALL CLEAR packet
- **useAppStore**: `isGlobalEmergency`, `mapRefreshTrigger`, `setGlobalEmergency`, `triggerMapRefresh`
- **MissionPrepScreen**: όταν TEST_MODE off → `cancelEmergencyBroadcast()` για reset
- **State reset fix**: Emergency → Cancel → Emergency → Cancel λειτουργεί κάθε φορά
  - `sendEmergencyBroadcast`: `setGlobalEmergency(true)` στην αρχή
  - Radar condition: `(isEmergency || isGlobalEmergency)` – virtual marker όταν DB δεν έχει ενημερωθεί ακόμα
  - Cancel button: `useAppStore(isGlobalEmergency)` για άμεση ενημέρωση UI

### Audio Calibration Suite – Προετοιμασία για Quansheng/iPhone
- **TX Delay (Preamble)**: slider 100–1000ms στο Settings → Audio Calibration
- **Digital Gain**: slider 0.5–1.5 (output volume multiplier)
- **SecureStore**: `txDelayMs`, `digitalGain` – persistent settings
- **AudioEngine**: 1200Hz pre-carrier tone πριν το AFSK data (VOX opener), configurable amplitude
- **BeaconService**: παίζει AFSK audio μέσω phone output με txDelay και gain, route packet στο DB
- **WaveformMonitor**: oscilloscope-style visualizer που ενεργοποιείται όταν πατηθεί SEND BEACON
- **@react-native-community/slider**: dependency για sliders

### Git
- Commit & push στο GitHub

---

## 2026-03-16 (Δευτέρα) – Apple Health Integration & UI Fixes

### Apple Health (HealthKit) – πλήρης ολοκλήρωση
- **Πηγή δεδομένων**: BPM, Effort, Active Calories από Apple Health (όχι BLE)
- **Permissions**: HealthKit modal στο startup ή όταν εισέρχεται στο Dashboard
- **Read access**: HeartRate, ActiveEnergyBurned, StepCount

### Real-time Sync
- HR poll κάθε 5s για live display
- Full poll κάθε 20s (SpO2, RHR, Active Energy)
- **Last Known Value**: αν δεν υπάρχει HR στο 2h window, fetch από σήμερα (faded display)

### Effort Calculation
- Effort = (HR - RHR) / (MaxHR - RHR) με zone (LIGHT/MODERATE/HARD/MAX)
- **Max HR**: νέο πεδίο στο Settings (60–250 BPM), SecureSettings.getMaxHeartRate/setMaxHeartRate

### Settings – Apple Health
- **Enable Apple Health** toggle: άμεση αντίδραση (local state), αποθήκευση σε SecureSettings
- **Visual proof**: κόκκινο label όταν OFF, πράσινο όταν ON
- **Your Maximum Heart Rate (Max HR)**: για effort calculation

### Dashboard – BioMetricsSection
- **Visibility**: εμφανίζεται όταν appleHealthEnabled OR garminConnected (όχι μόνο garminConnected)
- **Labels**: BPM, EFFORT, ACTIVE always visible
- **Static Text only**: κανένα TextInput, μόνο `<Text>`
- **Fallback**: `--` όταν null/zero, "Waiting for Apple Health data..." κάτω
- **Container**: minHeight 120 για ορατότητα
- **BPM Magenta**: #ff00ff για test build

### Pull-to-Refresh & Permissions
- **RefreshControl** στο Dashboard: άμεσο HealthKit sync
- **Grant Health Permissions** button: ανοίγει system settings (Linking.openSettings)

### Reliability & Crash Fixes
- **GarminSyncService**: safe HealthKit load με try/catch (require αντί για import)
- AppleHealthKit null check πριν κάθε κλήση
- BioMetricsSection simplified: αφαίρεση Animated, heartRateLive

### Slider
- **TacticalSlider**: custom PanResponder-based (όχι @react-native-community/slider)

### Git
- Commit & push στο GitHub

---

## 2026-03-17 (Τρίτη) – HealthKit Fix, Inventory Polish, UX Improvements

### HealthKit – Κρίσιμη διόρθωση
- **Πρόβλημα**: "HealthKit module not loaded (rebuild native app)" – το module δεν φόρτωνε
- **Αιτία**: `require('react-native-health').default` – το package δεν έχει default export
- **Λύση**: `require('react-native-health')` απευθείας (module.exports = HealthKit)
- **Αποτέλεσμα**: BPM, Effort, Active Calories τώρα εμφανίζονται σωστά από Apple Health

### Health Debugging & UX
- **Συγκεκριμένα error messages**: αντί για "HEALTH_UNAVAILABLE", πλέον "HealthKit unavailable (Simulator or device without Health app)" ή "HealthKit module not loaded (rebuild native app)"
- **Retry Connection** button μέσα στο Bio-Metrics card όταν υπάρχει error
- **Auto-clear error**: όταν έρχονται πραγματικά δεδομένα (HR, SpO2, Active Energy), το error διαγράφεται αυτόματα
- **BPM styling**: placeholder `--` σε Orange (#FF8C00), live data σε Green (#22c55e)
- **Grant Health Permissions** button: εμφανίζεται όταν το error περιέχει "denied", "permission", "access"

### Inventory – Barcode & Location
- **Schema v11**: `barcode` column στο `inventory_items`
- **Barcode στο Item List**: μικρό amber badge με εικονίδιο + truncated barcode (π.χ. 590...457)
- **Barcode στο Item Form**: εμφάνιση με Scan icon για re-scan
- **Location tagging**: "Tag Current Location" λειτουργεί αμέσως κατά το Add Item (χωρίς "Save First")
- **Duplicate barcode**: όταν σκανάρεις barcode που υπάρχει ήδη στο kit, εμφανίζεται alert και "View Item" → highlight στο Kit Detail για 5 δευτερόλεπτα (Animated fade-out)

### Max HR Info
- **SettingsScreen**: info text κάτω από Max HR: "Typical range: 160–200. Used for Effort % calculation."

### Git
- Commit & push στο GitHub

---

## 2026-04-01 (Τετάρτη) – COMMS/APRS, pool & mission, active kit, power/logistics, Dashboard

### Στόχος (COMMS)
Ενοποίηση λειτουργιών Tactical Comms (χάρτης, τηλεμετρία, digipeaters, SMSGTE, AX.25) και τελική polish μετά από επιτυχή acoustic loopback decode.

### APRS & Modem
- **Θέση beacon**: `buildAegisTelemetryComment` – `AEGIS: HR:… INV:OK` από Apple Health (live/cached) και `getInventoryAprsStatus()` (OK/WARN/LOW).
- **TX AX.25**: `playAFSKPacket` → `buildAx25FrameBits` + `generateAFSKPcmFromBits` (preamble flags, FCS, NRZI) – fallback 8N1 αν αποτύχει parse header.
- **Loopback decode (mic)**: ρύθμιση στο Settings – κατά την αναπαραγωγή AFSK ανοίγει μικρόφωνο → `DecoderService` → `routeDecodedPacket` (`modemMicLoopback.ts`, `AudioEngine`).
- **Προεπιλογή TX Delay**: **500 ms** (από 300 ms) για VOX/ραδιόφωνα – `TX_DELAY_DEFAULT_MS`, sliders/AudioEngine defaults.

### COMMS UI
- **APRS MAP** / **SOS → SMSGTE**, κύμα (`WaveformMonitor`).
- **RECENT DIGIPEATERS** στο κάτω μέρος της οθόνης RADIO – λίστα τελευταίων μοναδικών digi στο path όταν το δικό σου callsign εμφανίζεται με WIDE/path.
- **Pulse animation**: μαλακό πράσινο (`#86efac`) στον τίτλο όταν προστίθεται νέο μοναδικό digi (`Animated`, `DigipeaterLog`).

### Settings
- **Emergency SMS** (E.164) για SMSGTE.
- **Loopback decode (mic)** switch + επεξήγηση.
- **APRS debug**: «Simulate received APRS» με path `WIDE1-1`, `WIDE2-1` (`simulateAprsPacket.ts`) για έλεγχο λίστας digi.
- **SMSGTE SOS**: το κείμενο προς αποστολή περιλαμβάνει και **βιομετρικά + inventory** όπως το beacon (`buildSmsgteMessageWithTelemetry`, όριο 67 χαρακτήρων με προτεραιότητα στο `AEGIS: HR:… INV:…`).

### Backend / Router
- `AprsPacketParser`: path, `extractDigipeatersFromPath`.
- `DecodedPacketRouter` + `useDigipeaterStore` όταν το source ταιριάζει με callsign/SSID χρήστη.
- `secureSettings`: `emergencySmsNumber`, `loopbackDecodeMode`.

### Στόχος (Inventory & Mission)
Αποθήκη ειδών ανεξάρτητη από kits, σύνδεση kit ↔ pool μέσω γραμμών pack, σύμβουλος αποστολής με προσαρμοσίσιμα presets, και μεταφορά διαχείρισης templates από Settings στο Global Inventory Pool.

### Database (schema v13 → v14)
- **v13**: Πίνακες `inventory_pool_items` (κατηγορία πισίνας, `water_liters_per_unit`, `is_waypoint`, κ.λπ.) και `kit_pack_items` (`kit_id`, `pool_item_id`, `quantity`). Migration SQL από legacy `inventory_items` → pool + pack, μετά `DROP` παλιού πίνακα.
- **v14**: Πίνακας `mission_presets` (`name`, `duration_days`, `calories_per_day`, `water_liters_per_day`). Model `MissionPreset`, `seedMissionPresets()` (default Overnight / 3-Day Bug-Out / Week Hunt + migration παλιού enum `aegis_mission_preset` → επιλεγμένο row id).
- Models: `InventoryPoolItem`, `KitPackItem`· αφαίρεση `InventoryItem`. `Kit` → `packItems`.

### Λογική & υπηρεσίες
- `poolCategories.ts`: σταθερές κατηγορίες πισίνας (tools, consumables, medical, shelter_clothing, comms_nav).
- `missionReadiness.ts`: `computeKitNutritionTotals`, `formatReadinessAgainstPreset` με στόχους `duration × kcal/day` και `duration × L/day` + νερό δεξαμενής kit.
- `secureSettings`: `activeKitId`, `selectedMissionPresetId` (αντί στατικών preset keys).

### UI – MISSION / Logistics
- **MissionPrepScreen**: τρεις ενότητες (Power & Devices, Active Kits, Global Pool), επιλογή **active kit**, **dynamic mission presets** από DB, readiness γραμμή, **Edit Presets** (inline + header), **35L Bug-Out** με ξεχωριστό κουμπί επεξεργασίας kit (`KitForm`).
- **MissionPresetListScreen** / **MissionPresetFormScreen**: CRUD presets (διάρκεια ημερών, kcal/ημέρα, L νερού/ημέρα).
- **KitDetailScreen**: λίστα γραμμών pack, **Add from Pool** → `PoolPickerScreen` (ανά κατηγορία).
- **InventoryPoolScreen**: **Add from Templates** (modal → δημιουργία pool item από `item_templates`), **Manage templates** → `TemplateList` / `TemplateForm`.
- **AddFromTemplatesModal**, μετακίνηση **TemplateList/TemplateForm** σε **MissionStack** και **InventoryStack** (αφαίρεση από Settings stack).

### Settings
- Αφαίρεση ενότητας **Manage Templates** από `SettingsScreen`· `SettingsStack` μόνο `Settings`.

### Λοιπά
- `seedBugOutKit`: εξασφάλιση kit **35L Bug-Out**.
- Map / dashboard / notifications / APRS inventory status: ανάγνωση από `inventory_pool_items` (και packs όπου χρειάζεται βάρος).
- `App.tsx`: `seedBugOutKit`, `seedMissionPresets` μετά το DB init.

### Mission & active kit
- Δυναμικό **active kit** από `SecureSettings.activeKitId` + live `kits` (observe)· αφαίρεση hardcoded **35L Bug-Out** / `seedBugOutKit`.
- **MissionPrep**: επιλογή kit (horizontal chips), readiness & PKG_WT με βάση το ενεργό kit· σύνδεση με **Mission presets** (DB).
- **KitForm**: δημιουργία χωρίς `kitId`, toggle **Set as active**, `replace` → **KitDetail** μετά το save.
- **KitList**: «New kit» → **KitForm** (όχι silent insert).
- Navigation: `KitForm: { kitId?: string }` σε Mission/Inventory/Shared stacks.

### Logistics & power devices (`power_devices`)
- **LogisticsScreen**: λίστα συσκευών, «Charged today» / ημερομηνία φόρτισης, **PowerDeviceForm** (όνομα, τύπος μπαταρίας, κύκλος συντήρησης).
- **powerDevicePoolSync**: δημιουργία **Power** pool row + σύνδεση `pool_item_id`· διαγραφή συγχρονισμένη.
- Schema **v16**: `battery_type`, `maintenance_cycle_days`, `pool_item_id` σε `power_devices`· migration αφαιρεί παλιά seed slugs `uv_k5` / `main_power_bank`.
- **seedPowerDevices**: κενό (χωρίς default συσκευές).

### Warehouse catalog & Item (μπαταρία σε μία φόρμα)
- Schema **v17**: `inventory_pool_items` + `battery_type`, `last_charge_at`, `battery_capacity_mah`, `charging_requirements`.
- **poolCategories**: επιπλέον `tactical_radios`, `power_units`, `power_banks`, `lighting`, `power`· **BATTERY_POOL_CATEGORY_KEYS** για conditional UI.
- **ItemForm**: ενότητα **Battery & Charging Management** (τύπος, ημερομηνία, χωρητικότητα, charging)· validation όταν η κατηγορία το απαιτεί· next review από **Maintenance_Alert_Threshold_Months** (Settings).
- **SecureSettings**: `get/setMaintenanceAlertThresholdMonths` (default 6 μήνες).

### InventoryPool & φίλτρο
- **Μία** λίστα καταλόγου· chip **Needs charge** + badges (NEEDS CHARGE / UPCOMING) σε γραμμές.
- Route params: **`InventoryPool: { filter?: 'needs_charge' }`** (nested: `Mission` → `InventoryPool`).

### Dashboard
- **Ένα** MAINTENANCE card: στατιστικά expiry + power STALE + αριθμός inventory που χρειάζονται charge/review.
- Δύο ενέργειες: **Logistics & power →** · **Inventory pool →** με `navigate('Mission', { screen: 'InventoryPool', params: { filter: 'needs_charge' } })`.
- **useDashboardData**: `batteryReviewDueCount`· παρατήρηση `power_devices` για STALE count.

### Σημείωση UX
- **Logistics** (`power_devices`) vs **Warehouse** (`inventory_pool_items`): δύο ρόλοι (λειτουργική φόρτιση vs catalog)· συζήτηση για μελλοντική ενοποίηση εισόδου μόνο από catalog.

### Git
- Ενημέρωση `WORKLOG.md` και commit + push στο GitHub (`main`, 2026-04-01).

---

## 2026-04-02 (Πέμπτη) – APRS κρυπτογράφηση, καθαρισμός pool/templates, Mission Prep UX

### APRS message encryption (dual-layer)
- **`crypto-js`** (AES-256-CBC): κλειδί από SHA256(UTF-8 passphrase)· wire `ENC:` + base64url(IV‖ciphertext) με **~72 χαρακτήρες** budget για single APRS status.
- **`src/services/aprsEncryption.ts`**: `encryptAprsPayload`, `decryptAprsPayloadWithKey`, `decodeIncomingAprsMessageBody` (Family → Rescuers → mismatch label).
- **`secureSettings.ts`**: `get/setFamilyEncryptionKey`, `get/setRescuersEncryptionKey` (expo-secure-store).
- **Settings**: ενότητα APRS message encryption – δύο πεδία (onBlur persist).
- **CommsScreenContent**: τρεις λειτουργίες (Plain / Family / Rescuers) + αποστολή status μέσω **`sendAprsStatusMessage`** όταν επιλέγεται κρυπτογράφηση.
- **`BeaconService`**: κρυπτογράφηση payload πριν το status packet όταν χρειάζεται.
- **`DecodedPacketRouter`**: εισερχόμενα με `ENC:` αποκωδικοποιούνται για log/UI (`Family: …` / `Rescuers: …` / `[Encrypted Message - Key Mismatch]`).

### Database (schema v18 → v19)
- **v18**: one-time wipe (`kit_pack_items`, `inventory_pool_items`, `power_devices`, `item_templates`, `kits`)· μετά το init **`ensurePatrolPackKit()`** – ένα κενό kit **35L Patrol Pack**.
- **v19**: `DROP TABLE item_templates`· αφαίρεση μοντέλου **`ItemTemplate`** και seed **`seedItemTemplates`**.

### Inventory / UI
- Αφαίρεση ροής **templates**: `AddFromTemplatesModal`, `TemplatePicker`, `TemplateListScreen`, `TemplateFormScreen`· απλοποίηση **`InventoryPoolScreen`** (chips wrap, κρυμμένες κενές ενότητες)· **`InventoryStack`**: routes templates αφαιρέθηκαν.
- **`inventoryPoolDelete.ts`**, **`formatWeight.ts`**, **`localeDecimal.ts`** για συνέπεια UI/διαγραφών.
- Ενημερώσεις **`ItemFormScreen`**, **`KitFormScreen`**, **`KitDetailScreen`**, **`PoolPickerScreen`**, **`PowerDeviceFormScreen`**, **`powerDevicePoolSync`**.

### Mission Prep
- **`MissionStack`**: αφαίρεση διπλού **Edit Presets** από το header· παραμένει μόνο δίπλα στο **Plan Mission** (`MissionPrepScreen`).

### Git
- Ενημέρωση `WORKLOG.md` και commit + push στο GitHub (`main`, `1ca3774`, 2026-04-02).

---

## 2026-04-03 (Παρασκευή) – Ενοποίηση Logistics/Warehouse, alert lead, Dashboard & ειδοποιήσεις

### Database (schema v20 → v21)
- **v20**: Ενοποίηση **Logistics** με **Warehouse** — μόνο `inventory_pool_items`: `maintenance_cycle_days`, merge δεδομένων από `power_devices`, εισαγωγή orphan rows ως pool items κατηγορίας `power`, **`DROP TABLE power_devices`**.
- **v21**: Στήλη **`alert_lead_days`** (optional) σε `inventory_pool_items`.
- Αφαίρεση μοντέλου **`PowerDevice`**, **`PowerDeviceFormScreen`**, **`seedPowerDevices`**, **`powerDevicePoolSync`**· ενημέρωση **`inventoryPoolDelete`**, navigation stacks, **`App.tsx`** / **`database/index.ts`**.

### Λογική ειδοποιήσεων ([`alertLeadTime.ts`](src/services/alertLeadTime.ts))
- **`CRITICAL_WINDOW_DAYS = 3`**: κόκκινο overdue **ή** μέσα στις τελευταίες 3 ημέρες πριν deadline (expiry + maintenance).
- Κίτρινο: παράθυρο **`alert_lead_days`** πριν το deadline, εκτός του 3ημέρου.
- Expiry **δεν** μετράει για κατηγορίες **BATTERY_POOL_CATEGORY_KEYS** (συμφωνία με UI).
- **`getPoolItemNotificationDeadlines`**, **`categoryNeedsBattery`** (export) για notifications/APRS.

### Logistics & φόρτιση ([`logisticsCharge.ts`](src/services/logisticsCharge.ts))
- **`setPoolItemLastChargeAt(poolItemId, ms)`** — κοινή εγγραφή `last_charge_at`· **`markPoolItemChargedNow`** το καλεί με `Date.now()`.
- **`LogisticsScreen`**: «Charged today» πάνω σε pool rows (όχι ξεχωριστό πίνακα συσκευών).

### Item form & ημερομηνίες
- **[`formatDateEu.ts`](src/shared/utils/formatDateEu.ts)**: DD-MM-YYYY για expiry / last charge.
- **Expiry**: εμφανίζεται **μόνο** όταν η κατηγορία **δεν** είναι battery pool· στο save τα battery items παίρνουν `expiryDate = null`.
- **Alert Lead Time**: **υποχρεωτικό** 1–3650 ημερών, default UI **14**· hints για κίτρινο vs κόκκινο 3ημέρου.

### Dashboard ([`useDashboardData.ts`](src/features/dashboard/hooks/useDashboardData.ts), [`DashboardScreen.tsx`](src/features/dashboard/screens/DashboardScreen.tsx))
- Μετρητές **`alertWarningCount`**, **`alertCriticalCount`**, **`alertMissingCount`** από **`getPoolItemAlertDisplay`** (όχι σταθερά 30 ημερών / STALE `power_devices`).
- **`expAlerts`** = άθροισμα ειδοποιήσεων· αφαίρεση links **Logistics & power →** και **Inventory pool →** από την κάρτα MAINTENANCE.

### Τοπικές ειδοποιήσεις ([`expirationNotifications.ts`](src/features/inventory/services/expirationNotifications.ts))
- Scheduler ανά item/deadline: **warning** στο lead, **critical** στο 3ήμερο (08:00 τοπικά)· ακύρωση legacy prefixes `expiry-*`, `proactive-expiry-*`, `inv-alert-*`· όριο ~60 scheduled triggers.
- **[`refreshInventoryNotifications.ts`](src/features/inventory/services/refreshInventoryNotifications.ts)**: μόνο **`scheduleExpiryNotifications`**.
- **[`proactiveInventoryNotifications.ts`](src/features/inventory/services/proactiveInventoryNotifications.ts)**: stub (ενσωματώθηκε στο νέο flow).

### APRS inventory status ([`inventoryAprsStatus.ts`](src/services/inventoryAprsStatus.ts))
- OK / WARN / LOW από **`getPoolItemAlertDisplay`** (όχι global `getExpiryDays`).

### Settings ([`SettingsScreen.tsx`](src/features/crisis/screens/SettingsScreen.tsx))
- Αφαίρεση ενοτήτων **Battery & warehouse maintenance** (μήνες) και **Expiry notifications** (global ημέρες)· η ρύθμιση είναι ανά είδος στο Item / warehouse.

### Λοιπά αρχεία (συνοδευτικές ενημερώσεις)
- **`batteryInventoryReview`**, **`powerLogisticsStatus`**, **`KitDetailScreen`**, **`MissionPrepScreen`**, **`InventoryPoolScreen`**, mission/inventory navigation — ευθυγράμμιση με unified pool και νέα alert λογική.

### Git
- Ενημέρωση `WORKLOG.md` και commit + push στο GitHub (`main`, `5066f38`, 2026-04-03).

---

## 2026-04-04 (Σάββατο) – Κατηγορία Water, Dashboard MAINTENANCE λίστα, Logistics report

### Κατηγορίες & φόρμα είδους ([`poolCategories.ts`](src/shared/constants/poolCategories.ts), [`ItemFormScreen.tsx`](src/features/inventory/screens/ItemFormScreen.tsx))
- Νέα κατηγορία **`water`**: πεδίο **λίτρα ανά μονάδα** (μόνο εκεί)· **Consumables** μόνο **Calories** (φαγητά/MRE κ.λπ.) — **χωρίς** water στο consumables.
- Βοηθητικές: **`poolCategoryShowsCalories`**, **`poolCategoryShowsWaterLitersField`**· legacy mapping: `water` / hydration → `water`, όχι πλέον water → consumables.

### Readiness & λίστες
- [`missionReadiness.ts`](src/services/missionReadiness.ts): kcal μόνο από **`consumables`**, νερό από γραμμές **`water`**.
- [`KitDetailScreen`](src/features/inventory/screens/KitDetailScreen.tsx): σύνολο kcal μόνο consumables· εμφάνιση **L** για γραμμές Water.
- [`InventoryPoolScreen`](src/features/inventory/screens/InventoryPoolScreen.tsx), [`PoolPickerScreen`](src/features/inventory/screens/PoolPickerScreen.tsx): meta `kcal` / `L/unit` ανά κατηγορία.

### Dashboard MAINTENANCE ([`alertLeadTime.ts`](src/services/alertLeadTime.ts), [`useDashboardData.ts`](src/features/dashboard/hooks/useDashboardData.ts), [`DashboardScreen.tsx`](src/features/dashboard/screens/DashboardScreen.tsx))
- **`listDashboardMaintenanceAlerts`**: λίστα ειδοποιήσεων βάσει Alert lead (expiry + charge/check due)· γραμμές με badge RED/YEL/MISS.
- **Tap** στο item → **Mission → ItemForm** (`poolItemId`) για ενημέρωση.

### Logistics ([`LogisticsScreen.tsx`](src/features/inventory/screens/LogisticsScreen.tsx))
- **Read-only** «Logistics report»· αφαίρεση **Charged today**· ενημέρωση φόρτισης/ημερομηνιών μόνο από **Warehouse (Item form)**· **Open in Warehouse**.

### Git
- Ενημέρωση `WORKLOG.md` και commit + push στο GitHub (`main`, `8e1b1ec`, 2026-04-04).

---

## Template για νέες ημέρες

```markdown
## YYYY-MM-DD (Ημέρα)

### Εργασία 1
- Περιγραφή

### Εργασία 2
- Περιγραφή
```
