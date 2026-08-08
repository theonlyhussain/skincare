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

    fun saveApiKey(key: String) {
        encryptedPrefs.edit().putString("API_KEY", key).apply()
    }

    fun getApiKey(): String? {
        return encryptedPrefs.getString("API_KEY", null)
    }

    fun saveBudget(budget: Float) {
        prefs.edit().putFloat("BUDGET", budget).apply()
    }

    fun getBudget(): Float {
        return prefs.getFloat("BUDGET", 0f)
    }
}
