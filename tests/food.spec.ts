import { test, expect } from '@playwright/test';
import { FoodPage, EditFoodPage } from './pages';

test.describe('Adding a new food', () => {



test('calories per 100g inferred from quantity if not set', async ({ page }) => {
    const foodPage = new FoodPage(page);
    
    // Navigate to the food page
    await foodPage.goto();
    
    // Check if we're in test mode by looking for the test indicator
    await expect(foodPage.navbar.testIndicator).toBeVisible();
    await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    
    // Click the "Add New Food" button (this will navigate to edit_food.html)
    await foodPage.clickAddFood();
    
    // Wait for navigation to edit_food.html
    await page.waitForURL('**/edit_food.html*');
    
    // Create EditFoodPage instance for the edit form functionality
    const editFoodPage = new EditFoodPage(page);
    
    // Fill in the food details on the edit form
    const testFoodName = `Test Food ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    await editFoodPage.fillFoodBrand('Test Brand');
    
    // Get the first quantity component
    const quantity = await editFoodPage.getQuantityComponent(0);
    
    // Fill in quantity details
    await quantity.selectQuantity('custom');
    await quantity.fillWeight('100');
    await quantity.fillCalories('250');
   
    // Add a quantity with weight and kcal
    await editFoodPage.addQuantity();

    // Check calories per 100g is updated

    await expect(await quantity.getCaloriesPer100g()).toEqual("250")
   
    console.log(`✅ Successfully tested infer calories per 100g`);
  });
  


  test('weight per 100g is stored and displayed', async ({ page }) => {
    const foodPage = new FoodPage(page);
    
    // Navigate to the food page
    await foodPage.goto();
    
    // Check if we're in test mode by looking for the test indicator
    await expect(foodPage.navbar.testIndicator).toBeVisible();
    await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    
    // Click the "Add New Food" button (this will navigate to edit_food.html)
    await foodPage.clickAddFood();
    
    // Wait for navigation to edit_food.html
    await page.waitForURL('**/edit_food.html*');
    
    // Create EditFoodPage instance for the edit form functionality
    const editFoodPage = new EditFoodPage(page);
    
    // Fill in the food details on the edit form
    const testFoodName = `Test Food ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    await editFoodPage.fillFoodBrand('Test Brand');
    await page.fill('#kcal-per-100g', '250');
    
    await editFoodPage.addQuantity();
    
    // Save the food (this should navigate back to food.html)
    await editFoodPage.saveFood();
    
    // Wait for navigation back to food.html
    await page.waitForURL('**/food.html*');
    
    // Search for the newly created food
    await foodPage.searchFood(testFoodName);
    
    // Find the food in the list and verify it exists
    const foodItem = await foodPage.getFoodItem(testFoodName);
    await expect(foodItem.parentDiv).toBeVisible();
    await expect(foodItem.foodKcal).toContainText('250 kcal/100g');
    
    
    console.log(`✅ Successfully tested food kcal-per-100g saved: ${testFoodName}`);
  });

});
