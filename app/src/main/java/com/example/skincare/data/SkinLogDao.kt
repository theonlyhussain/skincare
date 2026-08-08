package com.example.skincare.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SkinLogDao {
    @Query("SELECT * FROM skin_logs ORDER BY date ASC")
    fun getAllSkinLogs(): Flow<List<SkinLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSkinLog(skinLog: SkinLog)

    @Query("SELECT * FROM skin_logs ORDER BY date DESC LIMIT 1")
    suspend fun getLatestSkinLog(): SkinLog?
}
