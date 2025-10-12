import { test, expect } from '@playwright/test';
import { FoodPage, EditFoodPage } from './pages';

test.describe('Basic Page Object Tests', () => {
  test('should load food page and show test indicator', async ({ page }) => {
    const foodPage = new FoodPage(page);
    
    // Navigate to the food page
    await foodPage.goto();
    
    // Check if we're in test mode by looking for the test indicator
    await expect(foodPage.navbar.testIndicator).toBeVisible();
    await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    
    // Check that basic elements are visible
    await expect(foodPage.pageTitle).toBeVisible();
    await expect(foodPage.addFoodButton).toBeVisible();
    await expect(foodPage.searchInput).toBeVisible();
    
    console.log('✅ Basic food page test passed');
  });

  test('should navigate to edit food page when clicking add food', async ({ page }) => {
    const foodPage = new FoodPage(page);
    
    // Navigate to the food page
    await foodPage.goto();
    
    // Click add food button
    await foodPage.clickAddFood();
    
    // Should navigate to edit_food.html
    await page.waitForURL('**/edit_food.html*');
    
    // Create EditFoodPage instance for the edit form functionality
    const editFoodPage = new EditFoodPage(page);
    
    // Check that the form elements are visible
    await expect(editFoodPage.foodForm).toBeVisible();
    await expect(editFoodPage.foodNameInput).toBeVisible();
    await expect(editFoodPage.saveFoodButton).toBeVisible();
    
    console.log('✅ Navigation to edit food page test passed');
  });

    
  test('should show test database indicator on all pages', async ({ page }) => {
    const pages = [
      { path: '/day.html', name: 'Day' },
      { path: '/food.html', name: 'Food' },
      { path: '/meals.html', name: 'Meals' },
      { path: '/recipes.html', name: 'Recipes' },
      { path: '/progress.html', name: 'Progress' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Create a navbar component for this page
      const foodPage = new FoodPage(page);
      
      // Check that the test indicator is visible
      await expect(foodPage.navbar.testIndicator).toBeVisible();
      await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
      
      // Verify it has the correct styling
      await expect(foodPage.navbar.testIndicator).toHaveCSS('background-color', 'rgb(255, 107, 107)');
      await expect(foodPage.navbar.testIndicator).toHaveCSS('height', '10px');
      await expect(foodPage.navbar.testIndicator).toHaveCSS('position', 'fixed');
      await expect(foodPage.navbar.testIndicator).toHaveCSS('top', '0px');
      
      console.log(`✅ Test indicator verified on ${pageInfo.name} page`);
    }
  });
});
