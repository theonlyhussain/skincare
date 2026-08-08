package com.example.skincare.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.skincare.ui.home.HomeScreen
import com.example.skincare.ui.settings.SettingsScreen
import com.example.skincare.ui.skinlog.AnalysisScreen
import com.example.skincare.ui.skinlog.CameraScreen
import com.example.skincare.ui.skinlog.SkinLogDetailScreen
import com.example.skincare.ui.timeline.TimelineScreen

sealed class Screen(val route: String, val title: String, val icon: ImageVector?) {
    object Home : Screen("home", "Home", Icons.Filled.Home)
    object Timeline : Screen("timeline", "Timeline", Icons.Filled.DateRange)
    object ProductShelf : Screen("product_shelf", "Shelf", Icons.Filled.List)
    object Chat : Screen("chat", "Chat", Icons.Filled.Person) // We'll use Person icon for now
    object Settings : Screen("settings", "Settings", Icons.Filled.Settings)
    object Camera : Screen("camera", "Camera", null)
    object Analysis : Screen("analysis/{imageUri}", "Analysis", null)
    object Detail : Screen("detail/{logId}", "Detail", null)
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    
    val bottomNavItems = listOf(
        Screen.Home,
        Screen.Timeline,
        Screen.ProductShelf,
        Screen.Chat
    )

    Scaffold(
        bottomBar = {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route
            
            // Show bottom bar only on main screens
            if (currentRoute in bottomNavItems.map { it.route }) {
                NavigationBar {
                    bottomNavItems.forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon!!, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = currentRoute == screen.route,
                            onClick = {
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
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToCamera = { navController.navigate(Screen.Camera.route) },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
                )
            }
            composable(Screen.Timeline.route) {
                TimelineScreen()
            }
            composable(Screen.ProductShelf.route) {
                PlaceholderScreen("Product Shelf (v2)")
            }
            composable(Screen.Chat.route) {
                PlaceholderScreen("AI Chat (v2)")
            }
            composable(Screen.Settings.route) {
                SettingsScreen()
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
        }
    }
}

@Composable
fun PlaceholderScreen(title: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = title)
    }
}
