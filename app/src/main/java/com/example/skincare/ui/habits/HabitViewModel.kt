package com.example.skincare.ui.habits

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.HabitLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.LocalDate

class HabitViewModel(application: Application) : AndroidViewModel(application) {
    private val habitLogDao = AppDatabase.getDatabase(application).habitLogDao()
    
    private val _habitLogs = MutableStateFlow<List<HabitLog>>(emptyList())
    val habitLogs: StateFlow<List<HabitLog>> = _habitLogs.asStateFlow()

    private val _currentDayLog = MutableStateFlow<HabitLog?>(null)
    val currentDayLog: StateFlow<HabitLog?> = _currentDayLog.asStateFlow()

    private val today = LocalDate.now().toString()

    init {
        viewModelScope.launch {
            habitLogDao.getAllHabitLogs().collectLatest { logs ->
                _habitLogs.value = logs
                _currentDayLog.value = logs.find { it.date == today }
            }
        }
    }

    fun addWater(amountMl: Int) {
        viewModelScope.launch {
            val log = _currentDayLog.value ?: HabitLog(date = today, waterMl = 0, dietNotes = "")
            val updatedLog = log.copy(waterMl = log.waterMl + amountMl)
            habitLogDao.insertHabitLog(updatedLog)
        }
    }

    fun updateDietNotes(notes: String) {
        viewModelScope.launch {
            val log = _currentDayLog.value ?: HabitLog(date = today, waterMl = 0, dietNotes = "")
            val updatedLog = log.copy(dietNotes = notes)
            habitLogDao.insertHabitLog(updatedLog)
        }
    }
}
