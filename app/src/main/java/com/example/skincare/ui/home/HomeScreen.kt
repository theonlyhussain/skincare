package com.example.skincare.ui.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material.icons.outlined.WaterDrop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.skincare.data.SkinLog
import com.example.skincare.theme.UvLow
import com.example.skincare.theme.UvModerate
import com.example.skincare.theme.UvHigh
import com.example.skincare.theme.UvVeryHigh
import com.example.skincare.theme.UvExtreme
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.line.lineChart
import com.patrykandpatrick.vico.core.entry.entryModelOf
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToCamera: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToTimeline: () -> Unit = {},
    onNavigateToProducts: () -> Unit = {},
    onNavigateToHabits: () -> Unit = {},
    viewModel: HomeViewModel = viewModel()
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val skinLogs by viewModel.skinLogs.collectAsState()
    val uvIndex by viewModel.uvIndex.collectAsState()
    var selectedDays by remember { mutableStateOf<Int?>(7) }

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

    // Entrance animation state
    var screenVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { screenVisible = true }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "SkinCare",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onNavigateToSettings()
                    }) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onNavigateToCamera()
                },
                shape = RoundedCornerShape(20.dp),
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
            ) {
                Icon(Icons.Filled.CameraAlt, contentDescription = "New Scan")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 80.dp)
        ) {
            // --- Face Rating & UV Index ---
            AnimatedCardEntrance(visible = screenVisible, delay = 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Score Card
                    val latestLog = skinLogs.firstOrNull()
                    ElevatedCard(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateToTimeline()
                        },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        shape = RoundedCornerShape(24.dp),
                        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(20.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "Skin Score",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            if (latestLog != null) {
                                AnimatedScoreCounter(
                                    targetScore = latestLog.score,
                                    modifier = Modifier.padding(top = 8.dp)
                                )

                                val previousLog = skinLogs.getOrNull(1)
                                if (previousLog != null) {
                                    val diff = latestLog.score - previousLog.score
                                    val trendText = if (diff > 0) "+$diff from last" else if (diff < 0) "$diff from last" else "No change"
                                    Text(
                                        text = trendText,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (diff > 0) MaterialTheme.colorScheme.primary
                                        else if (diff < 0) MaterialTheme.colorScheme.error
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }
                            } else {
                                Text(
                                    "No scans yet",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                                Text(
                                    "Tap + to start",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // UV Index Card
                    ElevatedCard(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        shape = RoundedCornerShape(24.dp),
                        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "UV Index",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.fillMaxWidth()
                            )

                            if (uvIndex != null) {
                                val uv = uvIndex!!
                                UvGaugeRing(
                                    uvValue = uv,
                                    modifier = Modifier
                                        .size(80.dp)
                                        .padding(top = 4.dp)
                                )
                                val risk = when {
                                    uv < 3 -> "Low"
                                    uv < 6 -> "Moderate"
                                    uv < 8 -> "High"
                                    uv < 11 -> "Very High"
                                    else -> "Extreme"
                                }
                                Text(
                                    text = risk,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = getUvColor(uv)
                                )
                            } else {
                                Text(
                                    "Unavailable",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 16.dp)
                                )
                                Text(
                                    "Needs location",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // --- UV Protection Tip ---
            if (uvIndex != null) {
                AnimatedCardEntrance(visible = screenVisible, delay = 80) {
                    val uv = uvIndex!!
                    val tip = when {
                        uv < 3 -> "Minimal sun protection required for normal activity."
                        uv < 6 -> "Wear SPF 30+ sunscreen. Seek shade during midday."
                        uv < 8 -> "Wear SPF 50+, hat, and sunglasses. Reduce time in sun."
                        uv < 11 -> "Avoid sun exposure during midday. SPF 50+ is essential."
                        else -> "Stay indoors during peak hours. Maximum protection needed."
                    }
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = tip,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            // --- Trend Chart ---
            AnimatedCardEntrance(visible = screenVisible, delay = 160) {
                ElevatedCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            "Score Trend",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(7 to "7D", 30 to "30D", 90 to "90D", null to "All").forEach { (days, label) ->
                                FilterChip(
                                    selected = selectedDays == days,
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        selectedDays = days
                                    },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        val filteredLogs = viewModel.getFilteredLogs(skinLogs, selectedDays)
                        if (filteredLogs.size > 1) {
                            val entriesArr = filteredLogs.reversed().mapIndexed { index, log ->
                                com.patrykandpatrick.vico.core.entry.FloatEntry(index.toFloat(), log.score.toFloat())
                            }
                            if (entriesArr.isNotEmpty()) {
                                Chart(
                                    chart = lineChart(),
                                    model = com.patrykandpatrick.vico.core.entry.entryModelOf(entriesArr),
                                    startAxis = rememberStartAxis(),
                                    bottomAxis = rememberBottomAxis(),
                                    modifier = Modifier.height(180.dp)
                                )
                            }
                        } else {
                            Box(modifier = Modifier.height(120.dp), contentAlignment = Alignment.Center) {
                                Text(
                                    "Need more data for trend chart",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // --- Quick Access Cards ---
            AnimatedCardEntrance(visible = screenVisible, delay = 240) {
                Text(
                    "Quick Access",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AnimatedCardEntrance(visible = screenVisible, delay = 280) {
                    QuickAccessCard(
                        title = "Timeline",
                        icon = Icons.Outlined.Schedule,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateToTimeline()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                AnimatedCardEntrance(visible = screenVisible, delay = 340) {
                    QuickAccessCard(
                        title = "Products",
                        icon = Icons.Outlined.Inventory2,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateToProducts()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                AnimatedCardEntrance(visible = screenVisible, delay = 400) {
                    QuickAccessCard(
                        title = "Habits",
                        icon = Icons.Outlined.SelfImprovement,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateToHabits()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // --- Water Intake ---
            AnimatedCardEntrance(visible = screenVisible, delay = 460) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.WaterDrop,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "Water Intake",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                            Text(
                                "Aim for 2.5L to 3L daily to support skin hydration.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        }
                    }
                }
            }
        }
    }
}

// --- Animated Score Counter ---
@Composable
private fun AnimatedScoreCounter(
    targetScore: Int,
    modifier: Modifier = Modifier
) {
    val animatedScore by animateIntAsState(
        targetValue = targetScore,
        animationSpec = tween(
            durationMillis = 1200,
            easing = FastOutSlowInEasing
        ),
        label = "score_counter"
    )

    Text(
        text = "$animatedScore",
        style = MaterialTheme.typography.displayMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = modifier
    )
}

// --- UV Gauge Ring ---
@Composable
private fun UvGaugeRing(
    uvValue: Double,
    modifier: Modifier = Modifier
) {
    val maxUv = 12f
    val targetSweep = (uvValue.toFloat() / maxUv).coerceIn(0f, 1f) * 240f

    val animatedSweep by animateFloatAsState(
        targetValue = targetSweep,
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "uv_gauge"
    )

    val gaugeColor = getUvColor(uvValue)
    val trackColor = MaterialTheme.colorScheme.surfaceVariant

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 10.dp.toPx()
            val arcSize = Size(size.width - strokeWidth, size.height - strokeWidth)
            val topLeft = Offset(strokeWidth / 2, strokeWidth / 2)

            // Track
            drawArc(
                color = trackColor,
                startAngle = 150f,
                sweepAngle = 240f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            // Value
            drawArc(
                color = gaugeColor,
                startAngle = 150f,
                sweepAngle = animatedSweep,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }

        Text(
            text = "${uvValue.roundToInt()}",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = gaugeColor
        )
    }
}

@Composable
private fun getUvColor(uv: Double): Color {
    return when {
        uv < 3 -> UvLow
        uv < 6 -> UvModerate
        uv < 8 -> UvHigh
        uv < 11 -> UvVeryHigh
        else -> UvExtreme
    }
}

// --- Animated Card Entrance ---
@Composable
private fun AnimatedCardEntrance(
    visible: Boolean,
    delay: Int,
    content: @Composable RowScope.() -> Unit
) {
    var show by remember { mutableStateOf(false) }
    LaunchedEffect(visible) {
        if (visible) {
            kotlinx.coroutines.delay(delay.toLong())
            show = true
        }
    }

    AnimatedVisibility(
        visible = show,
        enter = fadeIn(tween(400)) + slideInVertically(
            initialOffsetY = { 30 },
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioLowBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
    ) {
        Row { content() }
    }
}

// --- Quick Access Card ---
@Composable
private fun QuickAccessCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    ElevatedCard(
        onClick = onClick,
        modifier = modifier.height(90.dp),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(22.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
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
