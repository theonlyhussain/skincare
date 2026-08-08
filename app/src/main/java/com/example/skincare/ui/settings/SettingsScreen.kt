package com.example.skincare.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.example.skincare.data.PrefsManager

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val prefsManager = remember { PrefsManager(context) }
    
    var geminiKey by remember { mutableStateOf(prefsManager.getGeminiApiKey() ?: "") }
    var glmKey by remember { mutableStateOf(prefsManager.getGlmApiKey() ?: "") }
    var selectedProvider by remember { mutableStateOf(prefsManager.getActiveProvider()) }
    var savedMessage by remember { mutableStateOf("") }

    val providers = listOf("gemini" to "Google Gemini", "glm" to "GLM (Alternate)")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(bottom = 32.dp))

        Text("Select AI Provider", style = MaterialTheme.typography.titleMedium, modifier = Modifier.align(Alignment.Start))
        
        Column(Modifier.selectableGroup()) {
            providers.forEach { (id, label) ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .selectable(
                            selected = (selectedProvider == id),
                            onClick = { selectedProvider = id },
                            role = Role.RadioButton
                        )
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = (selectedProvider == id),
                        onClick = null // null recommended for accessibility with selectable
                    )
                    Text(
                        text = label,
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(start = 16.dp)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        if (selectedProvider == "gemini") {
            OutlinedTextField(
                value = geminiKey,
                onValueChange = { geminiKey = it },
                label = { Text("Gemini API Key") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
        } else {
            OutlinedTextField(
                value = glmKey,
                onValueChange = { glmKey = it },
                label = { Text("GLM API Key") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                prefsManager.saveGeminiApiKey(geminiKey)
                prefsManager.saveGlmApiKey(glmKey)
                prefsManager.saveActiveProvider(selectedProvider)
                savedMessage = "Settings saved securely!"
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
