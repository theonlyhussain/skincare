package com.example.skincare.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

private val LightColorScheme = lightColorScheme(
    primary = SkinPrimary,
    onPrimary = SkinOnPrimary,
    primaryContainer = SkinPrimaryContainer,
    onPrimaryContainer = SkinOnPrimaryContainer,
    secondary = SkinSecondary,
    onSecondary = SkinOnSecondary,
    secondaryContainer = SkinSecondaryContainer,
    onSecondaryContainer = SkinOnSecondaryContainer,
    tertiary = SkinTertiary,
    onTertiary = SkinOnTertiary,
    tertiaryContainer = SkinTertiaryContainer,
    onTertiaryContainer = SkinOnTertiaryContainer,
    error = SkinError,
    onError = SkinOnError,
    errorContainer = SkinErrorContainer,
    onErrorContainer = SkinOnErrorContainer,
    background = SkinBackground,
    onBackground = SkinOnBackground,
    surface = SkinSurface,
    onSurface = SkinOnSurface,
    surfaceVariant = SkinSurfaceVariant,
    onSurfaceVariant = SkinOnSurfaceVariant,
    outline = SkinOutline,
    outlineVariant = SkinOutlineVariant,
    surfaceContainer = SkinSurfaceContainer,
    surfaceContainerHigh = SkinSurfaceContainerHigh,
)

private val DarkColorScheme = darkColorScheme(
    primary = SkinPrimaryDark,
    onPrimary = SkinOnPrimaryDark,
    primaryContainer = SkinPrimaryContainerDark,
    onPrimaryContainer = SkinOnPrimaryContainerDark,
    secondary = SkinSecondaryDark,
    onSecondary = SkinOnSecondaryDark,
    secondaryContainer = SkinSecondaryContainerDark,
    onSecondaryContainer = SkinOnSecondaryContainerDark,
    tertiary = SkinTertiaryDark,
    onTertiary = SkinOnTertiaryDark,
    tertiaryContainer = SkinTertiaryContainerDark,
    onTertiaryContainer = SkinOnTertiaryContainerDark,
    error = SkinErrorDark,
    onError = SkinOnErrorDark,
    errorContainer = SkinErrorContainerDark,
    onErrorContainer = SkinOnErrorContainerDark,
    background = SkinBackgroundDark,
    onBackground = SkinOnBackgroundDark,
    surface = SkinSurfaceDark,
    onSurface = SkinOnSurfaceDark,
    surfaceVariant = SkinSurfaceVariantDark,
    onSurfaceVariant = SkinOnSurfaceVariantDark,
    outline = SkinOutlineDark,
    outlineVariant = SkinOutlineVariantDark,
    surfaceContainer = SkinSurfaceContainerDark,
    surfaceContainerHigh = SkinSurfaceContainerHighDark,
)

// Expressive shapes inspired by Material 3 Expressive
val SkinCareShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(36.dp),
)

@Composable
fun SkinCareTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = SkinCareShapes,
        content = content
    )
}
