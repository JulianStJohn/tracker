import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

export class FoodPage_FoodItem {
  parentDiv: Locator;
  readonly foodName : Locator;
  readonly foodKcal: Locator;
  readonly editFoodButton: Locator;
  readonly selectFoodButton: Locator;
  readonly addToMealQuantityMultiplier: Locator;

  constructor(foodItem: Locator) { 
    this.parentDiv = foodItem

    this.foodName = this.parentDiv.locator('.food-name');
    this.foodKcal= this.parentDiv.locator('.food-kcal');
    this.editFoodButton = this.parentDiv.locator('.edit-food-btn');
    this.selectFoodButton = this.parentDiv.locator('.select-food-btn');

    this.addToMealQuantityMultiplier = this.parentDiv.locator('input.quantity-multiplier-meal')
  }

}



export class FoodPage extends BasePage {
  readonly navbar: NavbarComponent;
  
  // Main page elements
  readonly pageTitle: Locator;
  readonly addFoodButton: Locator;
  readonly searchInput: Locator;
  readonly searchClearButton: Locator;
  readonly foodList: Locator;
  
  // Food list elements
  readonly foodItems: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = new NavbarComponent(page);
    
    // Main page elements
    this.pageTitle = page.locator('h1');
    this.addFoodButton = page.locator('#add-food-btn');
    this.searchInput = page.locator('#food-search-input');
    this.searchClearButton = page.locator('#clear-search-btn'); // Need to verify if this exists
    this.foodList = page.locator('#food-list-results');
    
    // Food list elements
    this.foodItems = page.locator('.food-item');
  }

  

  async goto() {
    await super.goto('/food.html');
  }

  async clickAddFood() {
    await this.addFoodButton.click();
    // This will navigate to edit_food.html, so we don't wait for a form to appear
  }

  async searchFood(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for search to process
  }

  async clearSearch() {
    await this.searchClearButton.click();
  }

  async getFoodItem(foodName: string) {
  
    return new FoodPage_FoodItem((await this.foodItems).filter({ hasText: foodName }));
  }

  async editFood(foodName: string) {
    const foodItem = await this.getFoodItem(foodName);
    await foodItem.editFoodButton.click();
    // This will navigate to edit_food.html, so we don't wait for form to appear
  }

  /*
  async deleteFood(foodName: string) {
    const foodItem = await this.getFoodItem(foodName);
    await foodItem.deleteFoodButton.click();
    // Handle confirmation dialog if it exists
    await this.page.waitForTimeout(100);
  }
    */

  async getFoodCount() {
    return await this.foodItems.count();
  }
}
