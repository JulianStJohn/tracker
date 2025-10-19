import { test, expect } from '@playwright/test';
import { FoodApiPage } from './pages/FoodApiPage';
import { EditFoodPage } from './pages/EditFoodPage';

test.describe('Food API Search', () => {
  test('should navigate to API search page from food list', async ({ page }) => {
    // Go to food list
    await page.goto('/food.html');
    
    // Click API Search button
    await page.locator('.api-search-btn').click();
    
    // Should be on API search page
    await expect(page).toHaveURL(/food_api\.html/);
    await expect(page.locator('h1')).toContainText('API Food Search');
  });

  test('should handle invalid barcode search', async ({ page }) => {
    const foodApiPage = new FoodApiPage(page);
    await foodApiPage.goto();
    
    // Search with invalid barcode
    await foodApiPage.searchByBarcode('invalidbarcode123');
    
    // Should show results section with error
    await expect(foodApiPage.resultsSection).toBeVisible();
    await foodApiPage.expectErrorMessage('Product not found');
  });

  test('should redirect to edit food page with valid barcode', async ({ page }) => {
    const foodApiPage = new FoodApiPage(page);
    await foodApiPage.goto();
    
    // Use a known valid barcode (Coca-Cola Classic)
    await foodApiPage.searchByBarcode('5449000000996');
    
    // Should redirect to edit food page with API data
    await foodApiPage.expectToBeOnEditFoodPage();
    
    // Check if form is pre-filled
    const editFoodPage = new EditFoodPage(page);
    await expect(editFoodPage.foodNameInput).not.toHaveValue('');
    
    // Check if barcode field is visible and filled
    await expect(page.locator('#barcode-group')).toBeVisible();
    await expect(page.locator('#food-barcode')).toHaveValue('5449000000996');
  });

  test('should go back to food list', async ({ page }) => {
    const foodApiPage = new FoodApiPage(page);
    await foodApiPage.goto();
    
    // Click back button
    await foodApiPage.goBackToFoods();
    
    // Should be back on food list
    await expect(page).toHaveURL(/food\.html/);
  });
});
