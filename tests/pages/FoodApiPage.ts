import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class FoodApiPage extends BasePage {
  readonly barcodeInput: Locator;
  readonly searchButton: Locator;
  readonly backButton: Locator;
  readonly resultsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.barcodeInput = page.locator('#barcode-input');
    this.searchButton = page.locator('#search-btn');
    this.backButton = page.locator('.back-btn');
    this.resultsSection = page.locator('#results-section');
  }

  async goto() {
    await this.page.goto('/food_api.html');
    await this.waitForPageLoad();
  }

  async searchByBarcode(barcode: string) {
    await this.barcodeInput.fill(barcode);
    await this.searchButton.click();
  }

  async goBackToFoods() {
    await this.backButton.click();
  }

  async waitForSearchToComplete() {
    // Wait for the search button to not be disabled anymore
    await expect(this.searchButton).not.toBeDisabled();
  }

  async expectToBeOnEditFoodPage() {
    await expect(this.page).toHaveURL(/edit_food\.html/);
  }

  async expectErrorMessage(message: string) {
    const errorElement = this.page.locator('.error');
    await expect(errorElement).toContainText(message);
  }
}
