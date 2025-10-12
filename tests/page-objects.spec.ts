import { test, expect } from '@playwright/test';
import { DayPage, FoodPage } from './pages';

test.describe('Page Object Model Verification', () => {
  test('should navigate between pages using page objects', async ({ page }) => {
    // Test Day page
    const dayPage = new DayPage(page);
    await dayPage.goto();
    
    // Verify we're on the day page and test indicator is showing
    await expect(dayPage.navbar.testIndicator).toBeVisible();
    await expect(dayPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    await expect(dayPage.summaryPanel).toBeVisible();
    
    // Navigate to Food page using navbar
    await dayPage.navbar.navigateToFoods();
    
    // Create Food page object and verify we're there
    const foodPage = new FoodPage(page);
    await expect(foodPage.addFoodButton).toBeVisible();
    await expect(foodPage.searchInput).toBeVisible();
    
    // Verify test indicator is still showing
    await expect(foodPage.navbar.testIndicator).toBeVisible();
    await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    
    console.log('✅ Page navigation and page object model working correctly');
  });

  test('should handle mobile navigation using page objects', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    const dayPage = new DayPage(page);
    await dayPage.goto();
    
    // On mobile, desktop tabs should be hidden and hamburger should be visible
    await expect(dayPage.navbar.hamburgerButton).toBeVisible();
    await expect(dayPage.navbar.dayTab).not.toBeVisible();
    
    // Test mobile navigation
    await dayPage.navbar.openMobileMenu();
    await expect(dayPage.navbar.mobileMenu).toBeVisible();
    await expect(dayPage.navbar.mobileFoodsTab).toBeVisible();
    
    // Navigate to foods via mobile menu
    await dayPage.navbar.mobileFoodsTab.click();
    
    // Verify we're on the foods page
    const foodPage = new FoodPage(page);
    await expect(foodPage.addFoodButton).toBeVisible();
    
    console.log('✅ Mobile navigation working correctly with page objects');
  });
});
