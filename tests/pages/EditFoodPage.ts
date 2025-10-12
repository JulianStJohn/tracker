import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

export class FoodQuantityComponent {
  readonly page: Page;
  readonly quantityItem: Locator;
  readonly quantityNameSelect: Locator;
  readonly quantityNameInput: Locator;
  readonly quantityUnitSelect: Locator;
  readonly weightInput: Locator;
  readonly caloriesInput: Locator;
  readonly caloriesPer100g: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page, quantityItem: Locator) {
    this.page = page;
    this.quantityItem = quantityItem;
    this.quantityNameSelect = quantityItem.locator('select.quantity-name');
    this.quantityNameInput = quantityItem.locator('input.quantity-name');
    this.quantityUnitSelect = quantityItem.locator('.quantity-calories-unit');
    this.weightInput = quantityItem.locator('.quantity-weight');
    this.caloriesInput = quantityItem.locator('.quantity-kcal');
    this.caloriesPer100g = quantityItem.locator('.calories-per-100g');
    this.saveButton = quantityItem.locator('.quantity-save-btn');
    this.deleteButton = quantityItem.locator('.quantity-delete-btn');
  }

  async selectQuantity(quantityType: string) {
    await this.quantityNameSelect.selectOption(quantityType);
  }

  async useCustomQuantityName(quantityName: string){
    await this.quantityNameSelect.selectOption('custom');
    await this.quantityNameInput.fill(quantityName);
  }

  async fillWeight(weight: string) {
    await this.weightInput.fill(weight);
  }

  async fillCalories(calories: string) {
    await this.caloriesInput.fill(calories);
  }

  async save() {
    await this.saveButton.click();
  }

  async triggerCalculation() {
    // Trigger calculation by pressing Tab or clicking elsewhere
    await this.page.keyboard.press('Tab');
  }

  async getCaloriesPer100g() {
    return await this.caloriesPer100g.textContent();
  }

  async delete() {
    await this.deleteButton.click();
  }
}

export class EditFoodPage extends BasePage {
  readonly navbar: NavbarComponent;
  
  // Food form elements
  readonly foodForm: Locator;
  readonly foodNameInput: Locator;
  readonly foodBrandInput: Locator;
  readonly kcalPer100g: Locator;
  readonly selectCaloriesUnit: Locator;
  readonly addQuantityButton: Locator;
  readonly saveFoodButton: Locator;
  readonly cancelFoodButton: Locator;
  readonly deleteFoodButton: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = new NavbarComponent(page);
    
    // Food form elements (from edit_food.html)
    this.foodForm = page.locator('#food-form');
    this.foodNameInput = page.locator('#food-name');
    this.foodBrandInput = page.locator('#food-brand');
    this.kcalPer100g= page.locator('#kcal-per-100g');
    this.selectCaloriesUnit = page.locator('#main-calories-unit')
    this.addQuantityButton = page.locator('#add-quantity-btn');
    this.saveFoodButton = page.locator('#save-btn');
    this.cancelFoodButton = page.locator('#cancel-btn');
    this.deleteFoodButton = page.locator('#delete-btn'); // Need to check if this exists
  }

  async goto() {
    await super.goto('/edit_food.html');
  }

  async fillFoodName(name: string) {
    await this.foodNameInput.fill(name);
  }

  async fillFoodBrand(brand: string) {
    await this.foodBrandInput.fill(brand);
  }

  async addQuantity() {
    await this.addQuantityButton.click();
    await this.page.waitForSelector('.quantity-row', { state: 'visible' });
  }

  async getQuantityComponent(index: number = 0): Promise<FoodQuantityComponent> {
    const quantityItems = this.page.locator('.quantity-row');
    const quantityItem = quantityItems.nth(index);
    await quantityItem.waitFor({ state: 'visible' });
    return new FoodQuantityComponent(this.page, quantityItem);
  }

  async saveFood() {
    await this.saveFoodButton.click();
    // This will navigate back to food.html, so we don't wait for form to hide
  }

  async cancelFood() {
    await this.cancelFoodButton.click();
    await this.foodForm.waitFor({ state: 'hidden' });
  }

  async isFoodFormVisible() {
    return await this.foodForm.isVisible();
  }

  async waitForFoodFormHidden() {
    await this.foodForm.waitFor({ state: 'hidden' });
  }

  async waitForFoodFormVisible() {
    await this.foodForm.waitFor({ state: 'visible' });
  }
}
