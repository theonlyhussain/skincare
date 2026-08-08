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

    fun saveActiveProvider(provider: String) {
        prefs.edit().putString("ACTIVE_PROVIDER", provider).apply()
    }

    fun getActiveProvider(): String {
        return prefs.getString("ACTIVE_PROVIDER", "gemini") ?: "gemini"
    }

    fun saveBudget(budget: Float) {
        prefs.edit().putFloat("BUDGET", budget).apply()
    }

    fun getBudget(): Float {
        return prefs.getFloat("BUDGET", 0f)
    }
}
