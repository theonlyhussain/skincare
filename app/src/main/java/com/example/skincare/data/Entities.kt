package com.example.skincare.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "skin_logs")
data class SkinLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val date: String,
    val photoUri: String,
    val subscoresJson: String,
    val score: Int,
    val aiReasoning: String,
    val suggestionsJson: String,
    val personalNotes: String = ""
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val photoUri: String,
    val ingredientsJson: String,
    val price: Double,
    val addedDate: String
)

@Entity(tableName = "habit_logs")
data class HabitLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val date: String,
    val waterMl: Int,
    val dietNotes: String
)
