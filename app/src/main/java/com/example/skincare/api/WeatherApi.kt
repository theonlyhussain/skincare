package com.example.skincare.api

import retrofit2.http.GET
import retrofit2.http.Query

data class WeatherResponse(
    val daily: DailyData
)

data class DailyData(
    val uv_index_max: List<Double>
)

interface WeatherApi {
    @GET("v1/forecast?daily=uv_index_max&timezone=auto")
    suspend fun getUvIndex(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): WeatherResponse
}
