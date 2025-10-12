import { Page, Locator } from '@playwright/test';

export class NavbarComponent {
  readonly page: Page;
  readonly testIndicator: Locator;
  readonly navbar: Locator;
  readonly navbarTitle: Locator;
  
  // Desktop navigation
  readonly dayTab: Locator;
  readonly foodsTab: Locator;
  readonly mealsTab: Locator;
  readonly recipesTab: Locator;
  readonly progressTab: Locator;
  readonly dataTab: Locator;
  readonly logoutButton: Locator;
  
  // Mobile navigation
  readonly hamburgerButton: Locator;
  readonly mobileMenu: Locator;
  readonly mobileMenuBackdrop: Locator;
  readonly mobileMenuClose: Locator;
  readonly mobileDayTab: Locator;
  readonly mobileFoodsTab: Locator;
  readonly mobileMealsTab: Locator;
  readonly mobileRecipesTab: Locator;
  readonly mobileProgressTab: Locator;
  readonly mobileDataTab: Locator;
  readonly mobileLogoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Test indicator
    this.testIndicator = page.locator('#test-indicator');
    
    // Main navbar
    this.navbar = page.locator('#navbar');
    this.navbarTitle = page.locator('.navbar-title');
    
    // Desktop navigation
    this.dayTab = page.locator('#tab-day');
    this.foodsTab = page.locator('#tab-foods');
    this.mealsTab = page.locator('#tab-meals');
    this.recipesTab = page.locator('#tab-recipes');
    this.progressTab = page.locator('#tab-progress');
    this.dataTab = page.locator('#tab-data');
    this.logoutButton = page.locator('#logout');
    
    // Mobile navigation
    this.hamburgerButton = page.locator('#hamburger-btn');
    this.mobileMenu = page.locator('#mobile-menu');
    this.mobileMenuBackdrop = page.locator('#mobile-menu-backdrop');
    this.mobileMenuClose = page.locator('#mobile-menu-close');
    this.mobileDayTab = page.locator('#mobile-tab-day');
    this.mobileFoodsTab = page.locator('#mobile-tab-foods');
    this.mobileMealsTab = page.locator('#mobile-tab-meals');
    this.mobileRecipesTab = page.locator('#mobile-tab-recipes');
    this.mobileProgressTab = page.locator('#mobile-tab-progress');
    this.mobileDataTab = page.locator('#mobile-tab-data');
    this.mobileLogoutButton = page.locator('#mobile-logout');
  }

  async navigateToDay() {
    await this.dayTab.click();
  }

  async navigateToFoods() {
    await this.foodsTab.click();
  }

  async navigateToMeals() {
    await this.mealsTab.click();
  }

  async navigateToRecipes() {
    await this.recipesTab.click();
  }

  async navigateToProgress() {
    await this.progressTab.click();
  }

  async navigateToData() {
    await this.dataTab.click();
  }

  async openMobileMenu() {
    await this.hamburgerButton.click();
    await this.mobileMenu.waitFor({ state: 'visible' });
  }

  async closeMobileMenu() {
    await this.mobileMenuClose.click();
    await this.mobileMenu.waitFor({ state: 'hidden' });
  }

  async navigateToFoodsMobile() {
    await this.openMobileMenu();
    await this.mobileFoodsTab.click();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async isTestIndicatorVisible() {
    return await this.testIndicator.isVisible();
  }

  async getTestIndicatorText() {
    return await this.testIndicator.textContent();
  }
}
