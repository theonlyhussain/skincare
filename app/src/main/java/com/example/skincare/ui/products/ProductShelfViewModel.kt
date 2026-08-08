package com.example.skincare.ui.products

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.skincare.api.AiProvider
import com.example.skincare.api.GeminiProvider
import com.example.skincare.api.GlmProvider
import com.example.skincare.api.IngredientDetail
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.PrefsManager
import com.example.skincare.data.Product
import com.example.skincare.util.ConflictAnalyzer
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.LocalDate

class ProductShelfViewModel(application: Application) : AndroidViewModel(application) {
    private val productDao = AppDatabase.getDatabase(application).productDao()
    private val prefsManager = PrefsManager(application)
    private val gson = Gson()

    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    private val _conflicts = MutableStateFlow<List<ConflictAnalyzer.Conflict>>(emptyList())
    val conflicts: StateFlow<List<ConflictAnalyzer.Conflict>> = _conflicts.asStateFlow()

    private val _isAnalyzing = MutableStateFlow(false)
    val isAnalyzing: StateFlow<Boolean> = _isAnalyzing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        viewModelScope.launch {
            productDao.getAllProducts().collectLatest { productList ->
                _products.value = productList
                _conflicts.value = ConflictAnalyzer.analyzeConflicts(productList)
            }
        }
    }

    private fun getAiProvider(): AiProvider? {
        val type = prefsManager.getActiveProvider()
        val key = if (type == "gemini") prefsManager.getGeminiApiKey() else prefsManager.getGlmApiKey()
        if (key.isNullOrBlank()) return null
        return if (type == "gemini") GeminiProvider(key) else GlmProvider(key)
    }

    fun analyzeAndSaveProduct(base64Image: String, photoUri: String, price: Double = 0.0) {
        viewModelScope.launch {
            _isAnalyzing.value = true
            _error.value = null
            try {
                val provider = getAiProvider()
                if (provider == null) {
                    _error.value = "AI API key not set. Please go to Settings."
                    return@launch
                }

                val analysis = provider.analyzeProduct(base64Image)
                
                val product = Product(
                    name = analysis.name ?: "Unknown Product",
                    photoUri = photoUri,
                    ingredientsJson = gson.toJson(analysis.ingredients),
                    price = price,
                    addedDate = LocalDate.now().toString()
                )
                
                productDao.insertProduct(product)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to analyze product."
            } finally {
                _isAnalyzing.value = false
            }
        }
    }
    
    fun deleteProduct(product: Product) {
        viewModelScope.launch {
            productDao.deleteProduct(product)
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
