package com.example.skincare.ui.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.skincare.data.SkinLog
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.line.lineChart
import com.patrykandpatrick.vico.core.entry.entryModelOf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToCamera: () -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val context = LocalContext.current
    val skinLogs by viewModel.skinLogs.collectAsState()
    val uvIndex by viewModel.uvIndex.collectAsState()
    var selectedDays by remember { mutableStateOf<Int?>(7) } // 7, 30, 90, null(All)

    // Location Permission Launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            fetchLocationAndUv(context, viewModel)
        }
    }

    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fetchLocationAndUv(context, viewModel)
        } else {
            permissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SkinCare") },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToCamera) {
                Icon(Icons.Filled.Add, contentDescription = "New Scan")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Latest Score Card
            val latestLog = skinLogs.firstOrNull()
            if (latestLog != null) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Today's Score", style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = "${latestLog.score}",
                            style = MaterialTheme.typography.displayLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        
                        // Compare with previous
                        val previousLog = skinLogs.getOrNull(1)
                        if (previousLog != null) {
                            val diff = latestLog.score - previousLog.score
                            val trendText = if (diff > 0) "+$diff from last scan" else if (diff < 0) "$diff from last scan" else "No change"
                            Text(text = trendText, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            } else {
                Text("No scans yet. Tap + to start!")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Timeframe Toggles
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(7 to "7D", 30 to "30D", 90 to "90D", null to "All").forEach { (days, label) ->
                    FilterChip(
                        selected = selectedDays == days,
                        onClick = { selectedDays = days },
                        label = { Text(label) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Chart
            val filteredLogs = viewModel.getFilteredLogs(skinLogs, selectedDays)
            if (filteredLogs.size > 1) {
                val chartEntries = filteredLogs.reversed().mapIndexed { index, log ->
                    entryModelOf(index to log.score)
                }
                val model = chartEntries.first() // Merging not needed if single line, actually vico takes entries list
                // To create an EntryModel, we use entryModelOf(*entries)
                val entriesArr = filteredLogs.reversed().mapIndexed { index, log ->
                    com.patrykandpatrick.vico.core.entry.FloatEntry(index.toFloat(), log.score.toFloat())
                }
                
                if (entriesArr.isNotEmpty()) {
                    Chart(
                        chart = lineChart(),
                        model = com.patrykandpatrick.vico.core.entry.entryModelOf(entriesArr),
                        startAxis = rememberStartAxis(),
                        bottomAxis = rememberBottomAxis(),
                        modifier = Modifier.height(200.dp)
                    )
                }
            } else {
                Box(modifier = Modifier.height(200.dp), contentAlignment = Alignment.Center) {
                    Text("Need more data for trend chart")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // UV Widget
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Today's UV Risk", style = MaterialTheme.typography.titleSmall)
                    if (uvIndex != null) {
                        val uv = uvIndex!!
                        val risk = when {
                            uv < 3 -> "Low"
                            uv < 6 -> "Moderate"
                            uv < 8 -> "High"
                            else -> "Very High"
                        }
                        val tip = when {
                            uv < 3 -> "Minimal protection required."
                            uv < 6 -> "Wear SPF 30+."
                            uv < 8 -> "Wear SPF 50+ and a hat."
                            else -> "Stay indoors during midday."
                        }
                        Text("$uv - $risk", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                        Text(tip, style = MaterialTheme.typography.bodySmall)
                    } else {
                        Text("UV data unavailable (requires location).")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Static Water Widget
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Water Intake", style = MaterialTheme.typography.titleSmall)
                    Text("Aim for 2.5L to 3L daily to support skin hydration.", style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Quick Actions
            Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                Button(onClick = onNavigateToCamera) {
                    Icon(Icons.Filled.Face, contentDescription = "Scan")
                }
                Button(onClick = { /* Add Product (Phase 3) */ }) {
                    Icon(Icons.Filled.ShoppingCart, contentDescription = "Products")
                }
                Button(onClick = { /* AI Chat (Phase 6) */ }) {
                    Icon(Icons.Filled.Info, contentDescription = "Chat")
                }
            }
        }
    }
}

private fun fetchLocationAndUv(context: Context, viewModel: HomeViewModel) {
    try {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val location = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)
        if (location != null) {
            viewModel.fetchUvIndex(location.latitude, location.longitude)
        } else {
            // Default to roughly center of US if no last known location is immediately available
            viewModel.fetchUvIndex(39.8283, -98.5795)
        }
    } catch (e: SecurityException) {
        // Ignored
    }
}
