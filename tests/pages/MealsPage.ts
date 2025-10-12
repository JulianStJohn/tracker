import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

export class MealCard {
  readonly page: Page;
  readonly mealCard: Locator;
  readonly mealName: Locator;
  readonly mealCalories: Locator;
  readonly mealSummaryInfo: Locator;
  readonly editButton: Locator;
  readonly useButton: Locator;
  readonly deleteButton: Locator;
  readonly mealSummary: Locator;
  readonly mealDetails: Locator;

  constructor(page: Page, mealCard: Locator) {
    this.page = page;
    this.mealCard = mealCard;
    this.mealName = mealCard.locator('.meal-name');
    this.mealCalories = mealCard.locator('.meal-calories');
    this.mealSummaryInfo = mealCard.locator('.meal-summary-info');
    this.editButton = mealCard.locator('.btn-edit');
    this.useButton = mealCard.locator('.btn-use');
    this.deleteButton = mealCard.locator('.btn-delete');
    this.mealSummary = mealCard.locator('.meal-summary');
    this.mealDetails = mealCard.locator('.meal-details');
  }

  async expand() {
    await this.mealSummary.click();
  }

  async edit() {
    await this.editButton.click();
  }

  async use() {
    await this.useButton.click();
  }

  async delete() {
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    await this.deleteButton.click();
  }

  async isExpanded() {
    return await this.mealCard.evaluate((el) => el.classList.contains('expanded'));
  }
}

export class MealsPage extends BasePage {
  readonly navbar: NavbarComponent;
  
  // Header elements
  readonly pageTitle: Locator;
  readonly createNewMealButton: Locator;
  
  // Search elements
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearButton: Locator;
  
  // Meals grid elements
  readonly mealsGrid: Locator;
  readonly mealCards: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly createFirstMealButton: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = new NavbarComponent(page);
    
    // Header elements
    this.pageTitle = page.locator('h1');
    this.createNewMealButton = page.locator('a[href="/edit_meal.html"]:has-text("Create New Meal")');
    
    // Search elements
    this.searchInput = page.locator('#searchInput');
    this.searchButton = page.locator('#searchBtn');
    this.clearButton = page.locator('#clearBtn');
    
    // Meals grid elements
    this.mealsGrid = page.locator('#mealsGrid');
    this.mealCards = page.locator('.meal-card');
    this.loadingIndicator = page.locator('#loading');
    this.emptyState = page.locator('#emptyState');
    this.createFirstMealButton = page.locator('#emptyState a[href="/edit_meal.html"]');
  }

  async goto() {
    await super.goto('/meals.html');
  }

  async clickCreateNewMeal() {
    await this.createNewMealButton.click();
  }

  async clickCreateFirstMeal() {
    await this.createFirstMealButton.click();
  }

  async searchMeals(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    // Wait for search to complete
    await this.page.waitForTimeout(500);
  }

  async searchMealsRealtime(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    // Wait for debounced search (300ms + processing time)
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.clearButton.click();
    await this.page.waitForTimeout(500);
  }

  async getMealCard(mealName: string): Promise<MealCard> {
    const mealCard = this.mealCards.filter({ has: this.page.locator('.meal-name', { hasText: mealName }) });
    await mealCard.waitFor({ state: 'visible' });
    return new MealCard(this.page, mealCard);
  }

  async getMealCardByIndex(index: number): Promise<MealCard> {
    const mealCard = this.mealCards.nth(index);
    await mealCard.waitFor({ state: 'visible' });
    return new MealCard(this.page, mealCard);
  }

  async getMealCount() {
    return await this.mealCards.count();
  }

  async isLoadingVisible() {
    return await this.loadingIndicator.isVisible();
  }

  async isEmptyStateVisible() {
    return await this.emptyState.isVisible();
  }

  async waitForMealsToLoad() {
    await this.loadingIndicator.waitFor({ state: 'hidden' });
    // Wait for either meals grid or empty state to be visible
    await Promise.race([
      this.mealsGrid.waitFor({ state: 'visible' }),
      this.emptyState.waitFor({ state: 'visible' })
    ]);
  }

  async getAllMealNames() {
    const mealNames = await this.mealCards.locator('.meal-name').allTextContents();
    return mealNames;
  }

  async getAllMealCalories() {
    const mealCalories = await this.mealCards.locator('.meal-calories').allTextContents();
    return mealCalories.map(cal => parseInt(cal.replace(' kcal', '')));
  }
}
