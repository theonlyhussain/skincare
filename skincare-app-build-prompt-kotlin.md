# Build Prompt: SkinCare App (Kotlin + Jetpack Compose)

Copy everything below into your AI coding agent.

---

## Project Overview

Build a native Android app called **SkinCare** using **Kotlin + Jetpack Compose + Material 3**. It's a personal skincare-tracking app that uses AI to score skin condition from photos, analyze the user's skincare products, and track habits (water, diet) that affect skin. It's free, no paywall, no ads — the user brings their own AI API key (GLM vision model). Android-only, no iOS. No OTA updates — standard rebuild/reinstall on changes. Prioritize the best possible UI polish (Material 3, dynamic color, smooth motion) and the best AI interaction quality.

## App Logo

There is a **PNG file in the working directory** that is the app's logo. Use it as:
- The app launcher icon (adaptive icon — generate the required mipmap sizes/foreground-background layers from it)
- The splash screen image
- Anywhere in-app branding is shown (e.g. Settings screen "About")

Do not generate a placeholder icon — locate and use the provided PNG.

## Tech Stack

- **Language/UI**: Kotlin, Jetpack Compose, Material 3 (with dynamic color / Material You theming enabled)
- **Navigation**: Navigation Compose
- **Local storage**: Room (SQLite) for structured data — no backend, no auth, fully on-device
- **Secure storage**: EncryptedSharedPreferences (via Jetpack Security) for the user's AI API key — never hardcode it
- **Camera**: CameraX
- **Networking**: Retrofit + OkHttp (or Ktor client) for calling the GLM API directly with the user's key
- **Async**: Kotlin Coroutines + Flow throughout (Room queries as Flow, network calls as suspend functions)
- **Charts**: Vico (Compose-native charting library) for the skin-score trend line, with tap-to-detail on points
- **Distribution**: Debug/release APK, installed directly or via internal testing — no OTA, no Play Store submission for now

## Core Features

### 1. Skin Tracking
- User takes/uploads a face photo via CameraX (show an on-screen framing guide overlay for consistent angle/lighting across sessions).
- Send the photo to the AI using the **Skin Scoring Prompt** below. Parse the structured JSON response.
- Compute the final 0-100 score **in app code** using the formula below — never let the AI output the final score directly.
- Persist each entry via Room: `id, date, photoUri, subscoresJson, score, aiReasoning`.
- Home screen shows a trend line chart (Vico) of scores over time; tapping a point opens that day's photo + full AI reasoning.
- When a previous entry exists, include its score/date in the AI request so it can comment on trend direction.

**Skin Scoring System Prompt** (send as the system message on each scoring call):
```
You are a dermatology-informed skin analysis assistant for the SkinCare app. You analyze a user's face photo and output a structured, consistent assessment. You are NOT diagnosing medical conditions — you are tracking visible skin metrics over time so the user can see trends.

Always respond with ONLY valid JSON, no preamble, no markdown fences. Follow this exact schema:

{
  "photo_quality": {
    "lighting": "good" | "dim" | "overexposed",
    "angle": "frontal" | "angled" | "unclear",
    "reliable": true | false,
    "note": "short note if reliable is false, else empty string"
  },
  "acne": {
    "comedones_estimate": <integer>,
    "papules_pustules_estimate": <integer>,
    "cysts_nodules_estimate": <integer>,
    "severity": "none" | "mild" | "moderate" | "severe"
  },
  "redness": <integer 1-5>,
  "texture_pores": <integer 1-5>,
  "hydration_appearance": <integer 1-5>,
  "comparison_to_previous": {
    "available": true | false,
    "trend": "improved" | "stable" | "worsened" | "unknown",
    "reasoning": "1-2 sentences, empty if not available"
  },
  "reasoning": "2-3 sentences, plain language, no medical jargon"
}

Rules:
- Be conservative and consistent — do not inflate or deflate estimates for encouragement.
- If lighting/angle is poor, still give your best estimate but set reliable: false.
- Never diagnose named skin conditions (e.g. do not say "this is rosacea").
- Do not output a final 0-100 score yourself — the app computes it.
```

**Score formula** (implement in Kotlin, not via AI):
```kotlin
fun computeScore(
    severity: String,
    comedones: Int,
    papulesPustules: Int,
    cystsNodules: Int,
    redness: Int,
    texturePores: Int,
    hydration: Int
): Int {
    val severityPenalty = mapOf("none" to 0, "mild" to 8, "moderate" to 18, "severe" to 30)[severity] ?: 0
    val lesionPenalty = minOf(
        20.0,
        comedones * 0.5 + papulesPustules * 1.5 + cystsNodules * 3.0
    )
    val rednessPenalty = (redness - 1) * 5
    val texturePenalty = (texturePores - 1) * 4
    val hydrationBonus = (hydration - 3) * 2

    val score = 100 - severityPenalty - lesionPenalty - rednessPenalty - texturePenalty + hydrationBonus
    return score.coerceIn(0.0, 100.0).roundToInt()
}
```

### 2. Product Shelf
- User photographs each skincare product's label/ingredient list via CameraX.
- Send the image to the AI with a prompt instructing it to extract and return structured ingredients as JSON (name + common function, e.g. "exfoliant", "moisturizer", "active") — same strict JSON-only discipline as the scoring prompt.
- Flag conflicting actives across the user's stored products using a small static rules table for well-known conflicts (e.g. multiple strong exfoliants, retinoid + benzoyl peroxide) — don't rely on AI judgment alone for this.
- Persist via Room: `id, name, photoUri, ingredientsJson, price, addedDate`.
- User sets a budget in Settings; recommendations filter by ingredient goals + price, grounded in the user's stated goals and existing shelf — not open-ended AI suggestions from nothing.

### 3. Habit Log
- Daily log: water intake (ml), and diet notes limited to the two most evidence-linked triggers to start (dairy, sugar).
- Persist via Room: `id, date, waterMl, dietNotes`.
- Show habit data alongside the skin score trend chart so the user can visually spot correlations themselves — the app should not assert causation.
- Local notification reminders are a nice-to-have for a later pass, not required in v1.

### 4. AI Chat (Skin Q&A)
- Chat screen using the GLM model for general skincare Q&A.
- System prompt instructs the AI to educate, not diagnose, and to suggest seeing a dermatologist for anything sounding like a medical concern (persistent severe acne, sudden changes, pain, signs of infection).
- Optionally include the user's recent skin log + product shelf as context so answers can reference their actual data.

## Data Schema (Room Entities)

```kotlin
@Entity(tableName = "skin_logs")
data class SkinLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val date: String,
    val photoUri: String,
    val subscoresJson: String,
    val score: Int,
    val aiReasoning: String
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val photoUri: String,
    val ingredientsJson: String,
    val price: Double,
    val addedDate: String
)

@Entity(tableName = "habit_logs")
data class HabitLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val date: String,
    val waterMl: Int,
    val dietNotes: String
)
```
(API key lives in EncryptedSharedPreferences, not Room. Budget and other simple prefs can go in regular/encrypted SharedPreferences.)

## Screens (v1)

1. **Home** — skin score trend chart (Vico) + today's score + quick-add actions
2. **Skin Log** — camera capture → AI scoring → result detail view
3. **Product Shelf** — grid of products → add new → detail view with ingredients + conflict flags
4. **Habits** — water/diet quick log, simple daily view
5. **Chat** — AI Q&A
6. **Settings** — API key entry (encrypted), budget input, app logo/about, data export/delete

## Non-Goals (v1)

- No backend, no user accounts, no cross-device sync
- No payments/paywall
- No medical diagnosis — everything framed as tracking/education
- No OTA updates — standard APK rebuild/reinstall
- No separate OCR pipeline — the AI vision call reads ingredient labels directly
- No iOS / no Kotlin Multiplatform

## First Build Pass (scope for this session)

Deliver only:
1. Full project scaffold: Compose + Material 3 theming (dynamic color enabled), Navigation Compose with bottom nav (Home, Skin Log, Product Shelf, Habits, Chat) + Settings reachable from Home, Room database setup, Retrofit/Ktor client wrapper for the GLM API using the encrypted-stored key, app icon + splash screen wired up from the provided PNG logo.
2. **Home** screen: skin score trend chart (Vico) + today's score + quick-add buttons.
3. **Skin Log** screen, fully working end-to-end: CameraX capture → AI scoring call → parse JSON → compute score via the formula above → save to Room → detail view → reflected on Home chart.

Stop here. Do not build Product Shelf, Habits, or Chat in this pass — those come in follow-up sessions once the AI scoring pipeline is proven out.
