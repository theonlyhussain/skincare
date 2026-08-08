package com.example.skincare.ui.timeline

import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.skincare.data.SkinLog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(
    viewModel: TimelineViewModel = viewModel()
) {
    val skinLogs by viewModel.skinLogs.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Skin Timeline") }
            )
        }
    ) { paddingValues ->
        if (skinLogs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Text("No skin logs yet. Take a scan on the Home screen!")
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(skinLogs) { log ->
                    TimelineItem(log = log, onNoteChanged = { newNote ->
                        viewModel.updatePersonalNote(log, newNote)
                    })
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineItem(log: SkinLog, onNoteChanged: (String) -> Unit) {
    var isEditingNote by remember { mutableStateOf(false) }
    var currentNote by remember(log.personalNotes) { mutableStateOf(log.personalNotes) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (log.photoUri != null) {
                    AsyncImage(
                        model = Uri.parse(log.photoUri),
                        contentDescription = "Skin Photo",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(80.dp)
                            .padding(end = 16.dp)
                    )
                }
                
                Column {
                    Text(text = "Date: ${log.date}", style = MaterialTheme.typography.bodySmall)
                    Text(
                        text = "Score: ${log.score}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = "AI Observations", style = MaterialTheme.typography.titleMedium)
            Text(text = log.aiReasoning, style = MaterialTheme.typography.bodyMedium)
            
            Spacer(modifier = Modifier.height(12.dp))
            Divider()
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(text = "Personal Notes", style = MaterialTheme.typography.titleMedium)
            if (isEditingNote) {
                OutlinedTextField(
                    value = currentNote,
                    onValueChange = { currentNote = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Add a note...") }
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    TextButton(onClick = { 
                        isEditingNote = false 
                        currentNote = log.personalNotes
                    }) {
                        Text("Cancel")
                    }
                    Button(onClick = {
                        onNoteChanged(currentNote)
                        isEditingNote = false
                    }) {
                        Text("Save")
                    }
                }
            } else {
                Text(
                    text = if (log.personalNotes.isEmpty()) "Tap to add a note" else log.personalNotes,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (log.personalNotes.isEmpty()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = { isEditingNote = true }) {
                    Text("Edit Note")
                }
            }
        }
    }
}
