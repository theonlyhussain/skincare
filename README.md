# SkinCare 🧴

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000000?logo=expo&logoColor=white)](https://expo.dev)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-6FCF97)](https://expo.dev)
[![Powered by EAS](https://img.shields.io/badge/Powered%20by-EAS%20Update-4630EB?logo=expo&logoColor=white)](https://expo.dev/eas)
[![License](https://img.shields.io/github/license/theonlyhussain/skincare)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/theonlyhussain/skincare/pulls)

A local-first skincare tracking app built with **Expo (React Native) + TypeScript**. It uses AI (GLM vision) to score skin condition from photos, analyzes your product shelf, and tracks habits — all on-device, no backend, no accounts, no ads. **You bring your own AI API key.**

## Features

| Screen | What it does |
| --- | --- |
| **Home** | Trend chart of skin scores, today's score ring, quick actions (log skin / +250ml water / add product) |
| **Skin Log** | Camera capture with a face-guidance overlay → AI scoring → subscores + reasoning, saved to SQLite |
| **Shelf** | Product grid with photos, budget tracking, and static conflict flags (retinoid + BPO, AHA + BHA, etc.) |
| **Habits** | Water + dairy/sugar quick log, notes, and an honest "your patterns" view (correlation, not causation) |
| **Chat** | Skin education Q&A, optionally grounded in your recent checks, shelf (with prices), goals, and budget |
| **Settings** | GLM API key (secure storage), vision model picker, budget, ingredient goals, JSON export, delete-all |

The final 0–100 score is always computed **in app code** with the documented formula — the AI never outputs a score directly.

## Getting started

```bash
npm install
npx expo start
```

Scan the QR with Expo Go (or run on an emulator with `npx expo run:android`). Note: `expo-camera`, `expo-secure-store`, and `expo-sqlite` require a **development build** (Expo Go does not include these native modules): `npx expo run:android` / `npx expo run:ios`.

### Your AI key

1. Create a free account at [open.bigmodel.cn](https://open.bigmodel.cn) and generate an API key.
2. In the app: **Settings → AI provider → paste key → Save**.
3. Pick a vision model:
   - `glm-4v-flash` — free, good for most checks (default)
   - `glm-4v-plus` — paid, higher accuracy

The key is stored with `expo-secure-store` and is only ever sent to the GLM API as a bearer token.

## Data & privacy

- SQLite on-device via `expo-sqlite` (skin logs, products, habits, settings).
- Photos are copied into the app's document directory (`photos/`).
- Full JSON export + "delete all" in Settings.
- Nothing leaves your device except the photos/text you choose to send to the AI provider.

## Distribution (EAS, OTA updates)

Configured for internal distribution + OTA updates via EAS Update on a `production` channel:

```bash
npx eas-cli login
npx eas-cli init                      # creates the project & updates URL
npx eas-cli update:configure          # writes updates.url into app.json (channel: production)
```

**First native build** (required to get the app on a device; do this again only when adding native deps or bumping the SDK):

```bash
npx eas-cli build --platform android --profile preview
# install the generated APK/AAB on your device(s)
```

**Faster iterations** — JS/logic/prompt changes ship without a rebuild:

```bash
npx eas-cli update --branch production --message "Improved skin scoring prompt"
```

`runtimeVersion` uses the `appVersion` policy, so JS updates land on all clients of the same binary version automatically.

## Project layout

```
src/
  db/          SQLite schema + typed CRUD (skin_logs, products, habit_logs, settings)
  ai/          GLM client, prompts, score formula, static conflict rules
  components/  ScoreRing, ScoreChart, SubscoreList, UI primitives
  screens/     Home, SkinLog, LogDetail, Shelf, AddProduct, ProductDetail, Habits, Chat, Settings
  navigation/  Root stack + bottom tabs
  utils/       images (resize/base64/persist), dates, export, delete
  theme.ts     design tokens
```
