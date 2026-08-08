package com.example.skincare.api

import android.util.Log
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

data class SkinScoreResult(
    val photoQuality: PhotoQuality,
    val acne: Acne,
    val redness: Int,
    val texturePores: Int,
    val hydrationAppearance: Int,
    val comparisonToPrevious: ComparisonToPrevious?,
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

class SkinScoringService(private val apiKey: String) {

    private val retrofit = Retrofit.Builder()
        .baseUrl("https://open.bigmodel.cn/")
        .client(
            OkHttpClient.Builder()
                .readTimeout(60, TimeUnit.SECONDS)
                .connectTimeout(60, TimeUnit.SECONDS)
                .build()
        )
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val api = retrofit.create(GlmApi::class.java)
    private val gson = Gson()

    suspend fun analyzeSkin(base64Image: String): Pair<SkinScoreResult, Int> {
        val prompt = """
            You are a dermatology-informed skin analysis assistant for the SkinCare app. You analyze a user's face photo and output a structured, consistent assessment. You are NOT diagnosing medical conditions — you are tracking visible skin metrics over time so the user can see trends.

            Always respond with ONLY valid JSON, no preamble, no markdown fences. Follow this exact schema:

            {
              "photo_quality": {
                "lighting": "good" | "dim" | "overexposed",
                "angle": "frontal" | "angled" | "unclear",
                "reliable": true | false,
                "note": "short note if reliable is false, else empty string"
              },
              "acne": {
                "comedones_estimate": <integer>,
                "papules_pustules_estimate": <integer>,
                "cysts_nodules_estimate": <integer>,
                "severity": "none" | "mild" | "moderate" | "severe"
              },
              "redness": <integer 1-5>,
              "texture_pores": <integer 1-5>,
              "hydration_appearance": <integer 1-5>,
              "comparison_to_previous": {
                "available": true | false,
                "trend": "improved" | "stable" | "worsened" | "unknown",
                "reasoning": "1-2 sentences, empty if not available"
              },
              "reasoning": "2-3 sentences, plain language, no medical jargon"
            }

            Rules:
            - Be conservative and consistent — do not inflate or deflate estimates for encouragement.
            - If lighting/angle is poor, still give your best estimate but set reliable: false.
            - Never diagnose named skin conditions (e.g. do not say "this is rosacea").
            - Do not output a final 0-100 score yourself — the app computes it.
        """.trimIndent()

        val request = GlmRequest(
            model = "glm-4v",
            messages = listOf(
                GlmMessage(
                    role = "user",
                    content = listOf(
                        GlmContent(type = "text", text = prompt),
                        GlmContent(type = "image_url", image_url = GlmImageUrl(url = "data:image/jpeg;base64,$base64Image"))
                    )
                )
            )
        )

        val response = api.getCompletion("Bearer $apiKey", request)
        val jsonString = response.choices.firstOrNull()?.message?.content ?: throw Exception("Empty response from AI")
        
        // Clean markdown fences if the AI ignores instructions
        val cleanedJson = jsonString.replace("```json", "").replace("```", "").trim()
        Log.d("SkinScoring", "Parsed JSON: $cleanedJson")

        val result = gson.fromJson(cleanedJson, SkinScoreResult::class.java)
        
        val score = computeScore(
            result.acne.severity,
            result.acne.comedonesEstimate,
            result.acne.papulesPustulesEstimate,
            result.acne.cystsNodulesEstimate,
            result.redness,
            result.texturePores,
            result.hydrationAppearance
        )

        return Pair(result, score)
    }

    private fun computeScore(
        severity: String,
        comedones: Int,
        papulesPustules: Int,
        cystsNodules: Int,
        redness: Int,
        texturePores: Int,
        hydration: Int
    ): Int {
        val severityPenalty = mapOf("none" to 0, "mild" to 8, "moderate" to 18, "severe" to 30)[severity.lowercase()] ?: 0
        val lesionPenalty = minOf(
            20.0,
            comedones * 0.5 + papulesPustules * 1.5 + cystsNodules * 3.0
        )
        val rednessPenalty = (redness - 1) * 5
        val texturePenalty = (texturePores - 1) * 4
        val hydrationBonus = (hydration - 3) * 2

        val score = 100 - severityPenalty - lesionPenalty - rednessPenalty - texturePenalty + hydrationBonus
        return score.coerceIn(0.0, 100.0).roundToInt()
    }
}
