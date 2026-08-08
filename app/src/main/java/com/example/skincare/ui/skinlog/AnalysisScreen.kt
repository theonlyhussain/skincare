package com.example.skincare.ui.skinlog

import android.net.Uri
import android.util.Base64
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.skincare.api.AiProvider
import com.example.skincare.api.GeminiProvider
import com.example.skincare.api.GlmProvider
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.PrefsManager
import com.example.skincare.data.SkinLog
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AnalysisScreen(
    imageUri: String?,
    onAnalysisComplete: (Int) -> Unit,
    onError: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    var status by remember { mutableStateOf("Analyzing your skin...") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(imageUri) {
        if (imageUri == null) {
            errorMessage = "No image provided"
            return@LaunchedEffect
        }

        coroutineScope.launch {
            try {
                val prefs = PrefsManager(context)
                val providerName = prefs.getActiveProvider()
                
                val provider: AiProvider = if (providerName == "glm") {
                    val apiKey = prefs.getGlmApiKey()
                    if (apiKey.isNullOrEmpty()) {
                        errorMessage = "GLM API Key not configured. Please set it in Settings."
                        return@launch
                    }
                    GlmProvider(apiKey)
                } else {
                    val apiKey = prefs.getGeminiApiKey()
                    if (apiKey.isNullOrEmpty()) {
                        errorMessage = "Gemini API Key not configured. Please set it in Settings."
                        return@launch
                    }
                    GeminiProvider(apiKey)
                }

                status = "Processing image..."
                val base64Image = withContext(Dispatchers.IO) {
                    val inputStream = context.contentResolver.openInputStream(Uri.parse(imageUri))
                    val bytes = inputStream?.readBytes()
                    inputStream?.close()
                    Base64.encodeToString(bytes, Base64.NO_WRAP)
                }

                status = "Consulting AI..."
                val (result, computedScore) = provider.analyzeSkin(base64Image)

                status = "Saving results..."
                val db = AppDatabase.getDatabase(context)
                
                val skinLog = SkinLog(
                    date = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
                    photoUri = imageUri,
                    subscoresJson = Gson().toJson(result),
                    score = computedScore,
                    aiReasoning = result.reasoning,
                    suggestionsJson = Gson().toJson(result.suggestions),
                    personalNotes = ""
                )

                withContext(Dispatchers.IO) {
                    db.skinLogDao().insertSkinLog(skinLog)
                }
                
                // Get the latest inserted ID to navigate to it
                val latestLog = withContext(Dispatchers.IO) { db.skinLogDao().getLatestSkinLog() }
                if (latestLog != null) {
                    onAnalysisComplete(latestLog.id)
                } else {
                    errorMessage = "Failed to save log."
                }
                
            } catch (e: Exception) {
                errorMessage = "Analysis failed: ${e.localizedMessage}"
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        if (errorMessage != null) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(errorMessage!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                androidx.compose.material3.Button(onClick = onError) {
                    Text("Go Back")
                }
            }
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text(status)
            }
        }
    }
}
