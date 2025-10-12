import { test, expect } from '@playwright/test';
import { DayPage, FoodPage, EditFoodPage } from './pages';

test.describe('Adding a new food', () => {
  let dayPage;

  test.beforeEach(async ({ page }) => {
    dayPage = new DayPage(page);
    await dayPage.goto();
    await page.waitForURL('**/day.html*');
    await expect(dayPage.navbar.testIndicator).toBeVisible();
    await expect(dayPage.navbar.testIndicator).toHaveText('TEST DATABASE');
  });


  test('default to 1 when adding food to day meal', async ({ page }) => {
    await dayPage.navbar.foodsTab.click()
    await page.waitForURL('**/food.html*')
  

    let foodPage = new FoodPage(page)
    await foodPage.clickAddFood();
    await page.waitForURL('**/edit_food.html*');
    let editFoodPage = new EditFoodPage(page);

    const testFoodName = `test food - ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    
    const quantity = await editFoodPage.getQuantityComponent(0);
    await quantity.selectQuantity('cup');
    await quantity.fillWeight('100');
    await quantity.fillCalories('50');
    await quantity.saveButton.click();

    await editFoodPage.saveFood();

    foodPage = new FoodPage(page)
    await foodPage.navbar.dayTab.click()
    await page.waitForURL('**/day.html*')

    dayPage = new DayPage(page)

    const mealItem = (await dayPage.getMealItems())[0]
    const name = await mealItem.mealName.textContent();


    await mealItem.addFoodToMealButton.click();

    foodPage = new FoodPage(page)

    await page.waitForURL('**/food.html*');
    await foodPage.searchFood(testFoodName);
    
    const foodItem = await foodPage.getFoodItem(testFoodName);
    await foodItem.selectFoodButton.click();

    await expect(await foodItem.addToMealQuantityMultiplier.inputValue()).toEqual('1')

    
  });


});