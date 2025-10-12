import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

export class FoodSearchResult {
  readonly page: Page;
  readonly resultItem: Locator;
  readonly foodName: Locator;
  readonly foodBrand: Locator;
  readonly foodDetails: Locator;

  constructor(page: Page, resultItem: Locator) {
    this.page = page;
    this.resultItem = resultItem;
    this.foodName = resultItem.locator('.food-result-name');
    this.foodBrand = resultItem.locator('.food-result-brand');
    this.foodDetails = resultItem.locator('.food-result-details');
  }

  async select() {
    await this.resultItem.click();
  }
}

export class SelectedFoodItem {
  readonly page: Page;
  readonly foodItem: Locator;
  readonly foodName: Locator;
  readonly foodBrand: Locator;
  readonly baseCalories: Locator;
  readonly quantityMultiplier: Locator;
  readonly quantitySelector: Locator;
  readonly weightInput: Locator;
  readonly calculatedCalories: Locator;
  readonly removeButton: Locator;

  constructor(page: Page, foodItem: Locator) {
    this.page = page;
    this.foodItem = foodItem;
    this.foodName = foodItem.locator('.selected-food-name');
    this.foodBrand = foodItem.locator('.selected-food-brand');
    this.baseCalories = foodItem.locator('.selected-food-base-calories');
    this.quantityMultiplier = foodItem.locator('.quantity-multiplier');
    this.quantitySelector = foodItem.locator('.quantity-selector');
    this.weightInput = foodItem.locator('.weight-input');
    this.calculatedCalories = foodItem.locator('.calculated-calories');
    this.removeButton = foodItem.locator('.remove-food-btn');
  }

  async setQuantityMultiplier(quantity: string) {
    await this.quantityMultiplier.fill(quantity);
    // Trigger change event
    await this.quantityMultiplier.blur();
  }

  async selectQuantityType(quantityType: string) {
    await this.quantitySelector.selectOption({ label: quantityType });
  }

  async setWeight(weight: string) {
    await this.weightInput.fill(weight);
    // Trigger change event
    await this.weightInput.blur();
  }

  async remove() {
    await this.removeButton.click();
  }

  async getCalculatedCalories() {
    const text = await this.calculatedCalories.textContent();
    return parseInt(text?.replace(' kcal', '') || '0');
  }

  async hasQuantityControls() {
    return await this.quantityMultiplier.isVisible();
  }
}

export class EditMealsPage extends BasePage {
  readonly navbar: NavbarComponent;
  
  // Header elements
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  
  // Form elements
  readonly mealForm: Locator;
  readonly editModeIndicator: Locator;
  readonly mealNameInput: Locator;
  
  // Food search elements
  readonly foodSearchInput: Locator;
  readonly searchFoodButton: Locator;
  readonly foodSearchResults: Locator;
  readonly foodResultItems: Locator;
  
  // Selected foods elements
  readonly selectedFoods: Locator;
  readonly selectedFoodsList: Locator;
  readonly selectedFoodItems: Locator;
  readonly emptyMessage: Locator;
  
  // Total calories
  readonly totalCalories: Locator;
  
  // Form actions
  readonly cancelButton: Locator;
  readonly debugButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = new NavbarComponent(page);
    
    // Header elements
    this.pageTitle = page.locator('#pageTitle');
    this.backButton = page.locator('a[href="/meals.html"]');
    
    // Form elements
    this.mealForm = page.locator('#mealForm');
    this.editModeIndicator = page.locator('#editModeIndicator');
    this.mealNameInput = page.locator('#mealName');
    
    // Food search elements
    this.foodSearchInput = page.locator('#foodSearch');
    this.searchFoodButton = page.locator('#searchFoodBtn');
    this.foodSearchResults = page.locator('#foodSearchResults');
    this.foodResultItems = page.locator('.food-result-item');
    
    // Selected foods elements
    this.selectedFoods = page.locator('#selectedFoods');
    this.selectedFoodsList = page.locator('#selectedFoodsList');
    this.selectedFoodItems = page.locator('.selected-food-item');
    this.emptyMessage = page.locator('.empty-message');
    
    // Total calories
    this.totalCalories = page.locator('#totalCalories');
    
    // Form actions
    this.cancelButton = page.locator('#cancelBtn');
    this.debugButton = page.locator('#debugBtn');
    this.submitButton = page.locator('#submitBtn');
  }

  async goto() {
    await super.goto('/edit_meal.html');
  }

  async gotoEditMeal(mealId: string) {
    await super.goto(`/edit_meal.html?edit=${mealId}`);
  }

  async gotoDayMeal(day: string, mealIndex: number) {
    await super.goto(`/edit_meal.html?day=${day}&meal=${mealIndex}`);
  }

  async gotoSaveAsTemplate(day: string, mealIndex: number) {
    await super.goto(`/edit_meal.html?action=save-as-template&day=${day}&meal=${mealIndex}`);
  }

  async fillMealName(name: string) {
    await this.mealNameInput.fill(name);
  }

  async searchFoods(searchTerm: string) {
    await this.foodSearchInput.fill(searchTerm);
    await this.searchFoodButton.click();
    // Wait for search results
    await this.page.waitForTimeout(500);
  }

  async searchFoodsRealtime(searchTerm: string) {
    await this.foodSearchInput.fill(searchTerm);
    // Wait for debounced search (300ms + processing time)
    await this.page.waitForTimeout(500);
  }

  async getFoodSearchResult(foodName: string): Promise<FoodSearchResult> {
    const resultItem = this.foodResultItems.filter({ has: this.page.locator('.food-result-name', { hasText: foodName }) });
    await resultItem.waitFor({ state: 'visible' });
    return new FoodSearchResult(this.page, resultItem);
  }

  async getFoodSearchResultByIndex(index: number): Promise<FoodSearchResult> {
    const resultItem = this.foodResultItems.nth(index);
    await resultItem.waitFor({ state: 'visible' });
    return new FoodSearchResult(this.page, resultItem);
  }

  async getSelectedFoodItem(foodName: string): Promise<SelectedFoodItem> {
    const foodItem = this.selectedFoodItems.filter({ has: this.page.locator('.selected-food-name', { hasText: foodName }) });
    await foodItem.waitFor({ state: 'visible' });
    return new SelectedFoodItem(this.page, foodItem);
  }

  async getSelectedFoodItemByIndex(index: number): Promise<SelectedFoodItem> {
    const foodItem = this.selectedFoodItems.nth(index);
    await foodItem.waitFor({ state: 'visible' });
    return new SelectedFoodItem(this.page, foodItem);
  }

  async getSelectedFoodCount() {
    return await this.selectedFoodItems.count();
  }

  async getTotalCalories() {
    const text = await this.totalCalories.textContent();
    return parseInt(text || '0');
  }

  async isEmptyMessageVisible() {
    return await this.emptyMessage.isVisible();
  }

  async isEditModeIndicatorVisible() {
    return await this.editModeIndicator.isVisible();
  }

  async isFoodSearchResultsVisible() {
    return await this.foodSearchResults.isVisible();
  }

  async saveMeal() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async debugSelectedFoods() {
    await this.debugButton.click();
  }

  async waitForNavigationToMeals() {
    await this.page.waitForURL('**/meals.html*');
  }

  async waitForNavigationToDay(day: string) {
    await this.page.waitForURL(`**/day.html?yyyymmdd=${day}*`);
  }

  async getAllSelectedFoodNames() {
    const foodNames = await this.selectedFoodItems.locator('.selected-food-name').allTextContents();
    return foodNames;
  }

  async getAllSelectedFoodCalories() {
    const calories = await this.selectedFoodItems.locator('.calculated-calories').allTextContents();
    return calories.map(cal => parseInt(cal.replace(' kcal', '')));
  }

  async getPageTitle() {
    return await this.pageTitle.textContent();
  }

  async getSubmitButtonText() {
    return await this.submitButton.textContent();
  }
}
