import { getDb } from './database';
import type { Ingredient, Product } from '../types';

interface ProductRow {
  id: number;
  name: string | null;
  photo_uri: string | null;
  ingredients: string | null;
  price: number | null;
  added_date: string | null;
}

function parseRow(row: ProductRow): Product {
  let ingredients: Ingredient[] = [];
  if (row.ingredients) {
    try {
      const parsed = JSON.parse(row.ingredients);
      if (Array.isArray(parsed)) ingredients = parsed;
    } catch {
      ingredients = [];
    }
  }
  return {
    id: row.id,
    name: row.name,
    photo_uri: row.photo_uri,
    ingredients,
    price: row.price,
    added_date: row.added_date ?? '',
  };
}

export async function addProduct(product: {
  name: string | null;
  photo_uri: string | null;
  ingredients: Ingredient[];
  price: number | null;
  added_date: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO products (name, photo_uri, ingredients, price, added_date) VALUES (?, ?, ?, ?, ?)',
    product.name,
    product.photo_uri,
    JSON.stringify(product.ingredients),
    product.price,
    product.added_date
  );
  return result.lastInsertRowId;
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY id DESC');
  return rows.map(parseRow);
}

export async function getProduct(id: number): Promise<Product | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ?', id);
  return row ? parseRow(row) : null;
}

export async function updateProductPrice(id: number, price: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE products SET price = ? WHERE id = ?', price, id);
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}
