package com.example.skincare.ui.chat

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.skincare.api.AiProvider
import com.example.skincare.api.GeminiProvider
import com.example.skincare.api.GlmProvider
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.PrefsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String,
    val isUser: Boolean
)

class ChatViewModel(application: Application) : AndroidViewModel(application) {
    private val prefsManager = PrefsManager(application)
    private val db = AppDatabase.getDatabase(application)
    
    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(ChatMessage(text = "Hi! I'm your Skincare AI. How can I help you today?", isUser = false))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private fun getAiProvider(): AiProvider? {
        val type = prefsManager.getActiveProvider()
        val key = if (type == "gemini") prefsManager.getGeminiApiKey() else prefsManager.getGlmApiKey()
        if (key.isNullOrBlank()) return null
        return if (type == "gemini") GeminiProvider(key) else GlmProvider(key)
    }

    private suspend fun buildContext(): String {
        val latestSkinLog = db.skinLogDao().getLatestSkinLog()
        val products = db.productDao().getAllProducts().firstOrNull() ?: emptyList()
        val latestHabit = db.habitLogDao().getHabitLogByDate(java.time.LocalDate.now().toString())

        val contextBuilder = java.lang.StringBuilder()
        if (latestSkinLog != null) {
            contextBuilder.appendLine("Latest Skin Score: ${latestSkinLog.score}/100")
            contextBuilder.appendLine("Recent Suggestions: ${latestSkinLog.suggestionsJson}")
        } else {
            contextBuilder.appendLine("No skin scans yet.")
        }

        contextBuilder.appendLine("\nUser's Current Products:")
        if (products.isEmpty()) {
            contextBuilder.appendLine("None logged.")
        } else {
            products.forEach { p ->
                contextBuilder.appendLine("- ${p.name} (Ingredients: ${p.ingredientsJson})")
            }
        }

        contextBuilder.appendLine("\nToday's Habits:")
        if (latestHabit != null) {
            contextBuilder.appendLine("Water: ${latestHabit.waterMl} ml")
            contextBuilder.appendLine("Diet Notes: ${latestHabit.dietNotes}")
        } else {
            contextBuilder.appendLine("No habits logged today.")
        }

        return contextBuilder.toString()
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        _messages.value = _messages.value + ChatMessage(text = text, isUser = true)
        
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val provider = getAiProvider()
                if (provider == null) {
                    _messages.value = _messages.value + ChatMessage(text = "Please set your AI API key in Settings.", isUser = false)
                    return@launch
                }

                val context = buildContext()
                val response = provider.generateChatResponse(context, text)
                
                _messages.value = _messages.value + ChatMessage(text = response, isUser = false)
            } catch (e: Exception) {
                _messages.value = _messages.value + ChatMessage(text = "Error: ${e.message}", isUser = false)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
