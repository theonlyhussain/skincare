package com.example.skincare.ui.timeline

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.SkinLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TimelineViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = AppDatabase.getDatabase(application).skinLogDao()

    val skinLogs: StateFlow<List<SkinLog>> = dao.getAllSkinLogs()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun updatePersonalNote(log: SkinLog, newNote: String) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val updatedLog = log.copy(personalNotes = newNote)
                dao.updateSkinLog(updatedLog) // Wait, we need an update method in Dao!
            }
        }
    }
}
