package com.example.skincare.ui.habits

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitScreen(
    viewModel: HabitViewModel = viewModel()
) {
    val currentDayLog by viewModel.currentDayLog.collectAsState()
    val allLogs by viewModel.habitLogs.collectAsState()

    var dietNotes by remember { mutableStateOf("") }
    
    LaunchedEffect(currentDayLog) {
        if (currentDayLog != null && currentDayLog?.dietNotes != dietNotes) {
            dietNotes = currentDayLog?.dietNotes ?: ""
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Daily Habits") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text("Today: ${LocalDate.now()}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(16.dp))

            // Water tracking
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Water Intake",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "${currentDayLog?.waterMl ?: 0} ml",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { viewModel.addWater(250) }) {
                            Icon(Icons.Filled.Add, contentDescription = "Add")
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("250 ml")
                        }
                        Button(onClick = { viewModel.addWater(500) }) {
                            Icon(Icons.Filled.Add, contentDescription = "Add")
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("500 ml")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Diet notes
            Text("Diet Notes (Dairy, Sugar, etc.)", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = dietNotes,
                onValueChange = { 
                    dietNotes = it
                    viewModel.updateDietNotes(it)
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("E.g., Ate a lot of chocolate today") },
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(32.dp))

            // History
            Text("History", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            
            if (allLogs.isEmpty()) {
                Text("No habit logs yet.", color = Color.Gray)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(allLogs.filter { it.date != LocalDate.now().toString() }) { log ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = log.date, fontWeight = FontWeight.Bold)
                                Text(text = "Water: ${log.waterMl} ml", style = MaterialTheme.typography.bodyMedium)
                                if (log.dietNotes.isNotBlank()) {
                                    Text(text = "Diet: ${log.dietNotes}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
