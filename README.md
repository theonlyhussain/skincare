<p align="center">
  <img src="skincarelogo.png" alt="App Logo" width="150" />
</p>

# SkinCare

SkinCare is a native Android application built with **Kotlin, Jetpack Compose, and Material 3**. It is a personal skincare-tracking app designed to help you monitor your skin condition over time. It uses AI to score your skin from photos, analyze your skincare products, and track habits, allowing you to track trends seamlessly.

## Features

- **Skin Tracking**: Capture daily photos and let AI analyze your skin metrics (acne, redness, texture, hydration) directly on your device.
- **Product Shelf & Ingredient Intelligence**: Take photos of your skincare products. The AI will extract the ingredients and the built-in Conflict Analyzer will warn you if you are mixing dangerous actives (like Retinol and AHA/BHA).
- **Habit Logging**: Track your daily water intake and diet notes to correlate your lifestyle with your skin's appearance.
- **Context-Aware AI Chat**: Talk to an AI Skincare Advisor that automatically reads your recent skin scores, current product shelf, and today's habits to give you personalized, non-medical advice.
- **Privacy-First**: No backend, no accounts, and no paywalls. Bring your own AI API key (Gemini or GLM) and all your data is stored locally via Room Database.

## Tech Stack

- **UI**: Jetpack Compose & Material 3 (Dynamic Color)
- **Local Storage**: Room (SQLite)
- **Security**: Jetpack Security (EncryptedSharedPreferences)
- **Networking**: Retrofit & OkHttp
- **Camera**: CameraX
- **Charts**: Vico Compose

## Getting Started

1. Clone the repository.
2. Open the project in Android Studio.
3. Build and run the app on an Android device or emulator.
4. Go to **Settings** and input your Gemini or GLM AI API key to enable skin analysis and chat features.
