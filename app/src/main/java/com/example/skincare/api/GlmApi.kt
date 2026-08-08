package com.example.skincare.api

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

data class GlmRequest(
    val model: String,
    val messages: List<GlmMessage>
)

data class GlmMessage(
    val role: String,
    val content: List<GlmContent>
)

data class GlmContent(
    val type: String,
    val text: String? = null,
    val image_url: GlmImageUrl? = null
)

data class GlmImageUrl(
    val url: String
)

data class GlmResponse(
    val choices: List<GlmChoice>
)

data class GlmChoice(
    val message: GlmResponseMessage
)

data class GlmResponseMessage(
    val role: String,
    val content: String
)

interface GlmApi {
    @POST("api/paas/v4/chat/completions")
    suspend fun getCompletion(
        @Header("Authorization") authHeader: String,
        @Body request: GlmRequest
    ): GlmResponse
}
