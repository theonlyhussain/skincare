package com.example.skincare.util

import com.example.skincare.api.IngredientDetail
import com.example.skincare.data.Product
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object ConflictAnalyzer {

    data class Conflict(
        val ingredient1: String,
        val ingredient2: String,
        val product1Name: String,
        val product2Name: String,
        val reason: String
    )

    fun analyzeConflicts(products: List<Product>): List<Conflict> {
        val conflicts = mutableListOf<Conflict>()
        val gson = Gson()
        val listType = object : TypeToken<List<IngredientDetail>>() {}.type

        // Flatten all active ingredients with their source product
        val activeIngredients = mutableListOf<Pair<String, String>>() // Pair of (IngredientName, ProductName)
        
        for (product in products) {
            try {
                val details: List<IngredientDetail> = gson.fromJson(product.ingredientsJson, listType)
                for (detail in details) {
                    if (detail.is_active) {
                        activeIngredients.add(Pair(detail.name.lowercase(), product.name))
                    }
                }
            } catch (e: Exception) {
                // Ignore parse errors for conflict analysis
            }
        }

        // Compare all pairs
        for (i in 0 until activeIngredients.size) {
            for (j in i + 1 until activeIngredients.size) {
                val (ing1, prod1) = activeIngredients[i]
                val (ing2, prod2) = activeIngredients[j]

                val conflictReason = checkConflict(ing1, ing2)
                if (conflictReason != null) {
                    conflicts.add(Conflict(ing1, ing2, prod1, prod2, conflictReason))
                }
            }
        }

        return conflicts.distinctBy { it.reason }
    }

    private fun checkConflict(ing1: String, ing2: String): String? {
        val pair = setOf(ing1, ing2)
        
        if (matches(pair, "retinol", "aha") || matches(pair, "retinol", "bha") || matches(pair, "retinol", "glycolic") || matches(pair, "retinol", "salicylic")) {
            return "Retinol and exfoliating acids (AHA/BHA) together can cause severe irritation and compromise your skin barrier."
        }
        
        if (matches(pair, "retinol", "benzoyl peroxide")) {
            return "Benzoyl Peroxide can deactivate Retinol, making it ineffective while increasing dryness."
        }
        
        if (matches(pair, "retinol", "vitamin c") || matches(pair, "retinol", "ascorbic acid")) {
            return "Retinol and Vitamin C operate at different pH levels and combining them can cause redness and peeling."
        }
        
        if ((matches(pair, "vitamin c", "aha") || matches(pair, "ascorbic acid", "aha") || matches(pair, "vitamin c", "bha") || matches(pair, "ascorbic acid", "bha") || matches(pair, "vitamin c", "glycolic") || matches(pair, "vitamin c", "salicylic"))) {
            return "Acids can destabilize Vitamin C, making it less effective and increasing the risk of irritation."
        }

        return null
    }

    private fun matches(pair: Set<String>, key1: String, key2: String): Boolean {
        return pair.any { it.contains(key1) } && pair.any { it.contains(key2) } && key1 != key2
    }
}
