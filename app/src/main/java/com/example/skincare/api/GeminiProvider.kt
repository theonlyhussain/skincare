package com.example.skincare.api

import com.google.gson.Gson
import kotlin.math.roundToInt

class GeminiProvider(private val apiKey: String) : AiProvider {

    private val api: GeminiApi = GeminiApi.create()
    private val gson = Gson()

    private val systemPrompt = """
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
          "suggestions": {
            "do_more": ["short actionable habit", "..."],
            "do_less": ["short habit to reduce", "..."],
            "try_this": ["one simple actionable suggestion"]
          },
          "reasoning": "2-3 sentences, plain language, no medical jargon"
        }

        Rules:
        - Be conservative and consistent — do not inflate or deflate estimates for encouragement.
        - If lighting/angle is poor, still give your best estimate but set reliable: false.
        - Never diagnose named skin conditions (e.g. do not say "this is rosacea").
        - Suggestions must stay educational/behavioral, never medical directives (no drug names, no dosages).
        - Do not output a final 0-100 score yourself — the app computes it.
    """.trimIndent()

    override suspend fun analyzeSkin(base64Image: String): Pair<SkinScoreResult, Int> {
        val request = GeminiRequest(
            contents = listOf(
                GeminiContent(
                    parts = listOf(
                        GeminiPart(text = systemPrompt),
                        GeminiPart(inline_data = GeminiInlineData(mime_type = "image/jpeg", data = base64Image))
                    )
                )
            )
        )

        val response = api.generateContent(apiKey, request)
        if (!response.isSuccessful) {
            throw Exception("Gemini API Error: ${response.code()} ${response.message()}")
        }

        val rawText = response.body()?.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            ?: throw Exception("Empty response from Gemini API")

        val json = rawText.replace("```json", "").replace("```", "").trim()
        val result = gson.fromJson(json, SkinScoreResult::class.java)

        val score = computeScore(
            severity = result.acne.severity,
            comedones = result.acne.comedonesEstimate,
            papulesPustules = result.acne.papulesPustulesEstimate,
            cystsNodules = result.acne.cystsNodulesEstimate,
            redness = result.redness,
            texturePores = result.texturePores,
            hydration = result.hydrationAppearance
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
        val severityPenalty = mapOf("none" to 0, "mild" to 8, "moderate" to 18, "severe" to 30)[severity] ?: 0
        val lesionPenalty = minOf(20.0, comedones * 0.5 + papulesPustules * 1.5 + cystsNodules * 3.0)
        val rednessPenalty = (redness - 1) * 5
        val texturePenalty = (texturePores - 1) * 4
        val hydrationBonus = (hydration - 3) * 2
        val score = 100 - severityPenalty - lesionPenalty - rednessPenalty - texturePenalty + hydrationBonus
        return score.coerceIn(0.0, 100.0).roundToInt()
    }

    private val productPrompt = """
        You are a skincare ingredient analysis assistant. You analyze a photo of a skincare product label (specifically the ingredient list) and output a structured assessment.
        Always respond with ONLY valid JSON, no preamble, no markdown fences. Follow this exact schema:
        {
          "brand": "brand name if visible, else null",
          "name": "product name if visible, else null",
          "ingredients": [
            {
              "name": "Ingredient Name",
              "function": "Brief description of its function (e.g., 'moisturizer', 'exfoliant', 'preservative')",
              "is_active": true | false
            }
          ],
          "warning": "Brief warning if any strictly harmful ingredients like high-concentration denatured alcohol or strong allergens are found. Otherwise null."
        }
    """.trimIndent()

    override suspend fun analyzeProduct(base64Image: String): ProductAnalysisResult {
        val request = GeminiRequest(
            contents = listOf(
                GeminiContent(
                    parts = listOf(
                        GeminiPart(text = productPrompt),
                        GeminiPart(inline_data = GeminiInlineData(mime_type = "image/jpeg", data = base64Image))
                    )
                )
            )
        )

        val response = api.generateContent(apiKey, request)
        if (!response.isSuccessful) {
            throw Exception("Gemini API Error: ${response.code()} ${response.message()}")
        }

        val rawText = response.body()?.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            ?: throw Exception("Empty response from Gemini API")

        val json = rawText.replace("```json", "").replace("```", "").trim()
        return gson.fromJson(json, ProductAnalysisResult::class.java)
    }

    override suspend fun generateChatResponse(context: String, message: String): String {
        val chatPrompt = """
            You are a supportive, educational skincare advisor. Answer the user's question.
            Do NOT diagnose medical conditions or suggest prescription drugs. Recommend seeing a dermatologist if they ask about severe conditions.
            
            Here is the user's current skincare context (latest skin logs and product shelf):
            $context
        """.trimIndent()

        val request = GeminiRequest(
            contents = listOf(
                GeminiContent(
                    parts = listOf(
                        GeminiPart(text = chatPrompt),
                        GeminiPart(text = "User Question: $message")
                    )
                )
            )
        )

        val response = api.generateContent(apiKey, request)
        if (!response.isSuccessful) {
            throw Exception("Gemini API Error: ${response.code()} ${response.message()}")
        }

        return response.body()?.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            ?: throw Exception("Empty response from Gemini API")
    }
}
