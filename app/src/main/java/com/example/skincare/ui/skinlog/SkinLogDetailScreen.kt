package com.example.skincare.ui.skinlog

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.skincare.api.Suggestions
import com.example.skincare.data.AppDatabase
import com.google.gson.Gson
import com.example.skincare.data.SkinLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SkinLogDetailScreen(logId: Int, onBack: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var skinLog by remember { mutableStateOf<SkinLog?>(null) }

    LaunchedEffect(logId) {
        coroutineScope.launch {
            val db = AppDatabase.getDatabase(context)
            withContext(Dispatchers.IO) {
                val logs = db.skinLogDao().getLatestSkinLog() // Fallback to latest for now
                skinLog = logs
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Analysis Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        val log = skinLog
        if (log == null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
                Text("Loading...")
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "Score: ${log.score}",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(text = "Date: ${log.date}", style = MaterialTheme.typography.bodyMedium)
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(text = "AI Reasoning", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = log.aiReasoning, style = MaterialTheme.typography.bodyLarge)
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(text = "Raw Subscores", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = log.subscoresJson, style = MaterialTheme.typography.bodySmall)

                Spacer(modifier = Modifier.height(24.dp))
                
                Text(text = "Suggestions", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(8.dp))
                val suggestions = try {
                    Gson().fromJson(log.suggestionsJson, Suggestions::class.java)
                } catch (e: Exception) {
                    null
                }

                if (suggestions != null) {
                    if (suggestions.doMore.isNotEmpty()) {
                        Text(text = "Do More:", fontWeight = FontWeight.Bold)
                        suggestions.doMore.forEach { Text(text = "- $it") }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    if (suggestions.doLess.isNotEmpty()) {
                        Text(text = "Do Less:", fontWeight = FontWeight.Bold)
                        suggestions.doLess.forEach { Text(text = "- $it") }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    if (suggestions.tryThis.isNotEmpty()) {
                        Text(text = "Try This:", fontWeight = FontWeight.Bold)
                        suggestions.tryThis.forEach { Text(text = "- $it") }
                    }
                } else {
                    Text(text = "No suggestions available or failed to load.")
                }
            }
        }
    }
}
