# AEGIS – Digital Survival OS

Offline-first Mission Control for Prepping, Ham Radio & Wearables.  
**MVP**: Inventory (kits, items, expiry, scaling, weight), SHTF mode, Battery Hub.

---

## Environment isolation

This project is **self-contained**. To avoid conflicts with other React Native or Expo apps:

1. **Use a dedicated Node version** (recommended: Node 20):
   ```bash
   cd /path/to/aegisapp
   nvm use    # if you use nvm and have .nvmrc
   # or: fnm use / volta use (depending on your manager)
   ```

2. **Install dependencies only inside this project**:
   ```bash
   npm install
   ```
   All dependencies live in `node_modules/` here; no global Expo/RN install required.

3. **Run and build only from this directory**. Do not run Expo or Metro from a parent folder that might contain other apps.

4. **Optional**: Use a separate terminal/profile when working on AEGIS so env vars and `npm` context stay scoped to this app.

---

## Development flow

### 1. Start with Expo (simulator / device)

```bash
npm start
```

Then:

- Press **i** for iOS Simulator, or **a** for Android emulator.
- Or scan the QR code with Expo Go on your iPhone/Android for a quick test.

### 2. Demo on your iPhone via Xcode

When you want a **native build** on your physical iPhone:

1. **Prebuild** the native iOS project (one-time or when you add native deps):
   ```bash
   npm run prebuild:ios
   ```

2. **Open in Xcode**:
   ```bash
   open ios/aegisapp.xcworkspace
   ```
   (Expo may generate a different folder name; check `ios/` after prebuild.)

3. In Xcode: select your **iPhone** as target, then **Run**. Install and run the app on the device.

4. For subsequent JS-only changes you can keep using **Expo Go** or run from Xcode again. For native changes, repeat prebuild and open Xcode.

### 3. Android later

```bash
npm run prebuild:android
```

Then open the Android project in Android Studio, select device/emulator, and run.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Start and open iOS simulator |
| `npm run android` | Start and open Android emulator |
| `npm run prebuild:ios` | Generate `ios/` for Xcode |
| `npm run prebuild:android` | Generate `android/` for Android Studio |

---

## Project structure

- `src/db/` – SQLite schema, init, repositories (profiles, kits, items, settings).
- `src/features/inventory/` – Kits, items, scaling, weight, expiry notifications.
- `src/features/crisis/` – SHTF mode, Battery Hub, Settings.
- `src/shared/` – Theme (light/dark/SHTF), navigation, store, types.

---

## Tech stack

- **Expo SDK 52** + React Native
- **expo-sqlite** – offline DB
- **Zustand** – app state (theme, SHTF)
- **React Navigation** – tabs + stacks
- **expo-notifications** – expiry reminders
- **expo-battery** – phone battery (Battery Hub)

All critical data is stored locally; the app works 100% offline.
