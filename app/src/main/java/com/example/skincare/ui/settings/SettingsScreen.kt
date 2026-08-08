package com.example.skincare.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.example.skincare.data.PrefsManager

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val prefsManager = remember { PrefsManager(context) }
    
    var apiKey by remember { mutableStateOf(prefsManager.getApiKey() ?: "") }
    var savedMessage by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(bottom = 32.dp))

        OutlinedTextField(
            value = apiKey,
            onValueChange = { apiKey = it },
            label = { Text("GLM API Key") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                prefsManager.saveApiKey(apiKey)
                savedMessage = "API Key saved securely!"
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save Settings")
        }

        if (savedMessage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(savedMessage, color = MaterialTheme.colorScheme.primary)
        }
    }
}
