package com.example.skincare.ui.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.skincare.api.WeatherApi
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.SkinLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class HomeViewModel(application: Application) : AndroidViewModel(application) {
    private val db = AppDatabase.getDatabase(application)
    private val dao = db.skinLogDao()

    val skinLogs: StateFlow<List<SkinLog>> = dao.getAllSkinLogs()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    private val _uvIndex = MutableStateFlow<Double?>(null)
    val uvIndex = _uvIndex.asStateFlow()

    private val weatherApi = Retrofit.Builder()
        .baseUrl("https://api.open-meteo.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(WeatherApi::class.java)

    fun fetchUvIndex(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            try {
                val response = weatherApi.getUvIndex(latitude, longitude)
                val uv = response.daily.uv_index_max.firstOrNull()
                _uvIndex.value = uv
            } catch (e: Exception) {
                _uvIndex.value = null
            }
        }
    }

    fun getFilteredLogs(logs: List<SkinLog>, days: Int?): List<SkinLog> {
        if (days == null) return logs
        
        val format = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        val cutoffTime = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(days.toLong())
        
        return logs.filter {
            val date = format.parse(it.date)
            date != null && date.time >= cutoffTime
        }
    }
}
