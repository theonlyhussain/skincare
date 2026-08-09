package com.example.skincare.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.skincare.data.PrefsManager
import com.example.skincare.ui.chat.ChatScreen
import com.example.skincare.ui.habits.HabitScreen
import com.example.skincare.ui.home.HomeScreen
import com.example.skincare.ui.onboarding.OnboardingScreen
import com.example.skincare.ui.products.ProductCameraScreen
import com.example.skincare.ui.products.ProductDetailScreen
import com.example.skincare.ui.products.ProductShelfScreen
import com.example.skincare.ui.settings.SettingsScreen
import com.example.skincare.ui.skinlog.AnalysisScreen
import com.example.skincare.ui.skinlog.CameraScreen
import com.example.skincare.ui.skinlog.SkinLogDetailScreen
import com.example.skincare.ui.timeline.TimelineScreen
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val title: String, val icon: ImageVector?, val selectedIcon: ImageVector? = null) {
    object Home : Screen("home", "Home", Icons.Outlined.Home, Icons.Filled.Home)
    object Chat : Screen("chat", "Chat", Icons.Outlined.ChatBubbleOutline, Icons.Filled.ChatBubble)
    object Settings : Screen("settings", "Settings", null)
    object Camera : Screen("camera", "Camera", null)
    object Analysis : Screen("analysis/{imageUri}", "Analysis", null)
    object Detail : Screen("detail/{logId}", "Detail", null)
    object Timeline : Screen("timeline", "Timeline", null)
    object ProductShelf : Screen("product_shelf", "Shelf", null)
    object Habit : Screen("habit", "Habit", null)
    object ProductCamera : Screen("product_camera", "Product Camera", null)
    object ProductDetail : Screen("product_detail/{productId}", "Product Detail", null)
    object Onboarding : Screen("onboarding", "Onboarding", null)
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val prefsManager = remember { PrefsManager(context) }
    val haptic = LocalHapticFeedback.current

    val startDestination = if (prefsManager.isOnboardingComplete()) {
        Screen.Home.route
    } else {
        Screen.Onboarding.route
    }

    val bottomNavItems = listOf(Screen.Home, Screen.Chat)
    val bottomNavRoutes = bottomNavItems.map { it.route }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                SkinCareBottomBar(
                    items = bottomNavItems,
                    currentRoute = currentRoute,
                    onItemClick = { screen ->
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        navController.navigate(screen.route) {
                            popUpTo(Screen.Home.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding),
            enterTransition = {
                fadeIn(tween(300)) + slideInHorizontally(
                    initialOffsetX = { 60 },
                    animationSpec = tween(300, easing = FastOutSlowInEasing)
                )
            },
            exitTransition = {
                fadeOut(tween(200))
            },
            popEnterTransition = {
                fadeIn(tween(300)) + slideInHorizontally(
                    initialOffsetX = { -60 },
                    animationSpec = tween(300, easing = FastOutSlowInEasing)
                )
            },
            popExitTransition = {
                fadeOut(tween(200)) + slideOutHorizontally(
                    targetOffsetX = { 60 },
                    animationSpec = tween(200)
                )
            }
        ) {
            composable(Screen.Onboarding.route) {
                OnboardingScreen(
                    onOnboardingComplete = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Onboarding.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToCamera = { navController.navigate(Screen.Camera.route) },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                    onNavigateToTimeline = { navController.navigate(Screen.Timeline.route) },
                    onNavigateToProducts = { navController.navigate(Screen.ProductShelf.route) },
                    onNavigateToHabits = { navController.navigate(Screen.Habit.route) }
                )
            }
            composable(Screen.Chat.route) {
                ChatScreen()
            }
            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Timeline.route) {
                TimelineScreen()
            }
            composable(Screen.ProductShelf.route) {
                ProductShelfScreen(
                    onAddProduct = { navController.navigate(Screen.ProductCamera.route) },
                    onProductClick = { productId ->
                        navController.navigate(Screen.ProductDetail.route.replace("{productId}", productId.toString()))
                    }
                )
            }
            composable(Screen.Habit.route) {
                HabitScreen()
            }
            composable(Screen.Camera.route) {
                CameraScreen(
                    onImageCaptured = { uri ->
                        val encodedUri = java.net.URLEncoder.encode(uri, "UTF-8")
                        navController.navigate(Screen.Analysis.route.replace("{imageUri}", encodedUri)) {
                            popUpTo(Screen.Home.route)
                        }
                    },
                    onCancel = { navController.popBackStack() }
                )
            }
            composable(Screen.Analysis.route) { backStackEntry ->
                val imageUri = backStackEntry.arguments?.getString("imageUri")
                val decodedUri = java.net.URLDecoder.decode(imageUri, "UTF-8")
                AnalysisScreen(
                    imageUri = decodedUri,
                    onAnalysisComplete = { logId ->
                        navController.navigate(Screen.Detail.route.replace("{logId}", logId.toString())) {
                            popUpTo(Screen.Home.route)
                        }
                    },
                    onError = { navController.popBackStack() }
                )
            }
            composable(Screen.Detail.route) { backStackEntry ->
                val logId = backStackEntry.arguments?.getString("logId")?.toIntOrNull() ?: 0
                SkinLogDetailScreen(
                    logId = logId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.ProductCamera.route) {
                ProductCameraScreen(
                    viewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
                    onProductAnalyzed = { navController.popBackStack() },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.ProductDetail.route) { backStackEntry ->
                val productId = backStackEntry.arguments?.getString("productId")?.toIntOrNull() ?: 0
                ProductDetailScreen(
                    productId = productId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
private fun SkinCareBottomBar(
    items: List<Screen>,
    currentRoute: String?,
    onItemClick: (Screen) -> Unit
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        tonalElevation = 0.dp,
        modifier = Modifier.height(80.dp)
    ) {
        items.forEach { screen ->
            val selected = currentRoute == screen.route

            NavigationBarItem(
                icon = {
                    val targetIcon = if (selected) screen.selectedIcon ?: screen.icon!! else screen.icon!!
                    AnimatedContent(
                        targetState = selected,
                        transitionSpec = {
                            (scaleIn(
                                initialScale = 0.8f,
                                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                            ) + fadeIn()) togetherWith
                            (scaleOut(targetScale = 0.8f) + fadeOut())
                        },
                        label = "nav_icon"
                    ) { isSelected ->
                        Icon(
                            imageVector = if (isSelected) screen.selectedIcon ?: screen.icon!! else screen.icon!!,
                            contentDescription = screen.title,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                },
                label = {
                    Text(
                        text = screen.title,
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                selected = selected,
                onClick = { onItemClick(screen) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    selectedTextColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            )
        }
    }
}

@Composable
fun PlaceholderScreen(title: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = title)
    }
}
