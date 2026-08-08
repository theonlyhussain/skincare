package com.example.skincare.api

import com.google.gson.annotations.SerializedName

data class SkinScoreResult(
    val photoQuality: PhotoQuality,
    val acne: Acne,
    val redness: Int,
    @SerializedName("texture_pores") val texturePores: Int,
    @SerializedName("hydration_appearance") val hydrationAppearance: Int,
    @SerializedName("comparison_to_previous") val comparisonToPrevious: ComparisonToPrevious?,
    val suggestions: Suggestions,
    val reasoning: String
)

data class PhotoQuality(
    val lighting: String,
    val angle: String,
    val reliable: Boolean,
    val note: String?
)

data class Acne(
    @SerializedName("comedones_estimate") val comedonesEstimate: Int,
    @SerializedName("papules_pustules_estimate") val papulesPustulesEstimate: Int,
    @SerializedName("cysts_nodules_estimate") val cystsNodulesEstimate: Int,
    val severity: String
)

data class ComparisonToPrevious(
    val available: Boolean,
    val trend: String?,
    val reasoning: String?
)

data class Suggestions(
    @SerializedName("do_more") val doMore: List<String>,
    @SerializedName("do_less") val doLess: List<String>,
    @SerializedName("try_this") val tryThis: List<String>
)

data class ProductAnalysisResult(
    val brand: String?,
    val name: String?,
    val ingredients: List<IngredientDetail>,
    val warning: String?
)

data class IngredientDetail(
    val name: String,
    val function: String,
    val is_active: Boolean
)

interface AiProvider {
    suspend fun analyzeSkin(base64Image: String): Pair<SkinScoreResult, Int>
    suspend fun analyzeProduct(base64Image: String): ProductAnalysisResult
    suspend fun generateChatResponse(context: String, message: String): String
}
