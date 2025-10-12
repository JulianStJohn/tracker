import { test, expect } from '@playwright/test';
import { FoodPage, EditFoodPage } from './pages';

test.describe('Adding a new food', () => {
  let editFoodPage;
  let foodPage;

  test.beforeEach(async ({ page }) => {
    foodPage = new FoodPage(page);
    await foodPage.goto();
    await expect(foodPage.navbar.testIndicator).toBeVisible();
    await expect(foodPage.navbar.testIndicator).toHaveText('TEST DATABASE');
    await foodPage.clickAddFood();
    await page.waitForURL('**/edit_food.html*');
    editFoodPage = new EditFoodPage(page);
  });

  test('save new food details', async ({ page }) => {

    const testFoodName = `Test Food ${Date.now()}`;
    const testFoodBrand = `Test Food Brand`;
    const testKcal = '250'
    const tspWeight = '212'
    
    //const customQuantity = 'springle'
    //const customWeight = '23'

    await editFoodPage.fillFoodName(testFoodName);
    await editFoodPage.fillFoodBrand(testFoodBrand);
    await editFoodPage.kcalPer100g.fill(testKcal)

    // there is a bug where selecting 'kcal' using playwright will change the value 
    // await editFoodPage.selectCaloriesUnit.selectOption('kcal')

    // need to add this to a meal to verify the quantities
    const quantity = await editFoodPage.getQuantityComponent(0);
    await quantity.selectQuantity('tsp')
    await quantity.fillWeight(tspWeight)

    await editFoodPage.saveFood();
    
    await page.waitForURL('**/food.html*');
    await foodPage.searchFood(testFoodName);
    
    const foodItem = await foodPage.getFoodItem(testFoodName);
    await expect(foodItem.parentDiv).toBeVisible();
    await expect(foodItem.foodKcal).toContainText(`${testKcal} kcal/100g`);

  });

test('calories per 100g is inferred from quantity if not set', async ({ page }) => {

    const testFoodName = `calories per 100g is inferred from quantity if not set - ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    
    const quantity = await editFoodPage.getQuantityComponent(0);
    await quantity.selectQuantity('custom');
    await quantity.fillWeight('100');
    await quantity.fillCalories('250');
    await quantity.saveButton.click();
   
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("250")
   

  });


test('unit conversion for quantity (kj to kcal) should not happen before quantity is saved', async ({ page }) => {

    const testFoodName = `unit conversion for quantity (kj to kcal) should not happen before quantity is saved - ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    
    const quantity = await editFoodPage.getQuantityComponent(0);
    await quantity.selectQuantity('tbsp');
    await quantity.fillWeight('100');
    await quantity.fillCalories('1000');
    await quantity.quantityUnitSelect.selectOption('kj');

    await expect(await quantity.caloriesInput.inputValue()).toEqual("1000")


  });


 
  test('unit conversion for food', async ({ page }) => {

    const testFoodName = `unit conversion for food - ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
    
    await editFoodPage.kcalPer100g.fill('1000');
    await editFoodPage.selectCaloriesUnit.selectOption('kj')
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("4184")
    await editFoodPage.selectCaloriesUnit.selectOption('kcal')
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("1000")
   
  });
  

test('modifying energy on any form field modifies others', async ({ page }) => {
    
    // Fill in the food details on the edit form
    const testFoodName = `modifying energy on any form field modifies all others - ${Date.now()}`;
    await editFoodPage.fillFoodName(testFoodName);
   
    
    const quantity = await editFoodPage.getQuantityComponent(0);
    await quantity.selectQuantity('tbsp');
    await quantity.fillWeight('100');
    await quantity.fillCalories('1000');
    await quantity.saveButton.click();
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("1000")

    await editFoodPage.addQuantityButton.click();
    const quantity2 = await editFoodPage.getQuantityComponent(1);
    
    await quantity2.selectQuantity('cup');
    await quantity2.fillWeight('100');
    await quantity2.fillCalories('800');
    await quantity2.saveButton.click();
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("800")

    await quantity2.fillWeight('50');
    await quantity2.fillCalories('800');
    await quantity2.saveButton.click();
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("1600")
   
    await quantity2.fillWeight('100');
    await quantity2.fillCalories('1000');
    await quantity2.quantityUnitSelect.selectOption('kj')
    await quantity2.saveButton.click();
    await expect(await editFoodPage.kcalPer100g.inputValue()).toEqual("239")
   
  
  });
  



});
