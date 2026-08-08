package com.example.skincare.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
@JvmSuppressWildcards
interface HabitLogDao {
    @Query("SELECT * FROM habit_logs ORDER BY date DESC")
    fun getAllHabitLogs(): Flow<List<HabitLog>>

    @Query("SELECT * FROM habit_logs WHERE date = :date LIMIT 1")
    suspend fun getHabitLogByDate(date: String): HabitLog?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHabitLog(habitLog: HabitLog): Long

    @Update
    suspend fun updateHabitLog(habitLog: HabitLog): Int

    @Delete
    suspend fun deleteHabitLog(habitLog: HabitLog): Int
}
