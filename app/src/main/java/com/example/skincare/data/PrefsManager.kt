package com.example.skincare.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class PrefsManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secret_shared_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val prefs: SharedPreferences = context.getSharedPreferences("skincare_prefs", Context.MODE_PRIVATE)

    // --- API Keys (encrypted) ---

    fun saveGlmApiKey(key: String) {
        encryptedPrefs.edit().putString("GLM_API_KEY", key).apply()
    }

    fun getGlmApiKey(): String? {
        return encryptedPrefs.getString("GLM_API_KEY", null)
    }

    fun saveGeminiApiKey(key: String) {
        encryptedPrefs.edit().putString("GEMINI_API_KEY", key).apply()
    }

    fun getGeminiApiKey(): String? {
        return encryptedPrefs.getString("GEMINI_API_KEY", null)
    }

    // --- AI Provider ---

    fun saveActiveProvider(provider: String) {
        prefs.edit().putString("ACTIVE_PROVIDER", provider).apply()
    }

    fun getActiveProvider(): String {
        return prefs.getString("ACTIVE_PROVIDER", "gemini") ?: "gemini"
    }

    // --- Budget ---

    fun saveBudget(budget: Float) {
        prefs.edit().putFloat("BUDGET", budget).apply()
    }

    fun getBudget(): Float {
        return prefs.getFloat("BUDGET", 0f)
    }

    // --- Onboarding ---

    fun isOnboardingComplete(): Boolean {
        return prefs.getBoolean("ONBOARDING_COMPLETE", false)
    }

    fun setOnboardingComplete(complete: Boolean) {
        prefs.edit().putBoolean("ONBOARDING_COMPLETE", complete).apply()
    }

    // --- Theme ---

    fun getThemeMode(): String {
        return prefs.getString("THEME_MODE", "system") ?: "system"
    }

    fun setThemeMode(mode: String) {
        prefs.edit().putString("THEME_MODE", mode).apply()
    }

    fun isDynamicColorEnabled(): Boolean {
        return prefs.getBoolean("DYNAMIC_COLOR_ENABLED", true)
    }

    fun setDynamicColorEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("DYNAMIC_COLOR_ENABLED", enabled).apply()
    }

    // --- Haptic Feedback ---

    fun isHapticFeedbackEnabled(): Boolean {
        return prefs.getBoolean("HAPTIC_FEEDBACK_ENABLED", true)
    }

    fun setHapticFeedbackEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("HAPTIC_FEEDBACK_ENABLED", enabled).apply()
    }

    // --- Animation Intensity ---

    fun getAnimationIntensity(): String {
        return prefs.getString("ANIMATION_INTENSITY", "full") ?: "full"
    }

    fun setAnimationIntensity(intensity: String) {
        prefs.edit().putString("ANIMATION_INTENSITY", intensity).apply()
    }

    // --- Notifications ---

    fun isNotificationsEnabled(): Boolean {
        return prefs.getBoolean("NOTIFICATIONS_ENABLED", true)
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("NOTIFICATIONS_ENABLED", enabled).apply()
    }

    // --- Clear All Data ---

    fun clearAllData() {
        prefs.edit().clear().apply()
        encryptedPrefs.edit().clear().apply()
    }
}
