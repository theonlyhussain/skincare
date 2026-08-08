package com.example.skincare.ui.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.skincare.api.IngredientDetail
import com.example.skincare.data.AppDatabase
import com.example.skincare.data.Product
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    productId: Int,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var product by remember { mutableStateOf<Product?>(null) }
    val productDao = remember { AppDatabase.getDatabase(context).productDao() }

    LaunchedEffect(productId) {
        coroutineScope.launch {
            withContext(Dispatchers.IO) {
                product = productDao.getProductById(productId)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Product Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        product?.let {
                            coroutineScope.launch {
                                withContext(Dispatchers.IO) {
                                    productDao.deleteProduct(it)
                                }
                                onBack()
                            }
                        }
                    }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete Product")
                    }
                }
            )
        }
    ) { paddingValues ->
        val currentProduct = product
        if (currentProduct == null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = currentProduct.name,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Added on ${currentProduct.addedDate}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(24.dp))

                Text(text = "Ingredient Intelligence", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(16.dp))

                val gson = Gson()
                val listType = object : TypeToken<List<IngredientDetail>>() {}.type
                val ingredients: List<IngredientDetail> = try {
                    gson.fromJson(currentProduct.ingredientsJson, listType)
                } catch (e: Exception) {
                    emptyList()
                }

                if (ingredients.isEmpty()) {
                    Text("Could not parse ingredients.", color = MaterialTheme.colorScheme.error)
                } else {
                    ingredients.forEach { ingredient ->
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (ingredient.is_active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = ingredient.name.uppercase(),
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (ingredient.is_active) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = ingredient.function,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (ingredient.is_active) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
