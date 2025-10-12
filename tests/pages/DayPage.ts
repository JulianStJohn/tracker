import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

export class MealItemComponent {
  readonly page: Page;
  readonly mealItem: Locator;
  
  // Meal header elements
  readonly mealHeader: Locator;
  readonly mealInfo: Locator;
  readonly mealTitle: Locator;
  readonly mealName: Locator;
  readonly totalCalories: Locator;
  
  // Action buttons in header
  readonly mealActions: Locator;
  readonly addFoodToMealButton: Locator;
  readonly addSavedMealButton: Locator;
  readonly editMealButton: Locator;
  
  // Meal content
  readonly mealFoods: Locator;
  readonly foodItems: Locator;
  readonly emptyMealMessage: Locator;
  
  // Footer buttons
  readonly mealFooter: Locator;
  readonly deleteMealButton: Locator;
  readonly addMealBelowButton: Locator;
  readonly saveMealTemplateButton: Locator;

  constructor(page: Page, mealItem: Locator) {
    this.page = page;
    this.mealItem = mealItem;
    
    // Meal header elements
    this.mealHeader = mealItem.locator('.meal-header');
    this.mealInfo = mealItem.locator('.meal-info');
    this.mealTitle = mealItem.locator('.meal-title');
    this.mealName = this.mealTitle; // Alias for convenience
    this.totalCalories = this.mealTitle; // The title contains "MealName - XXX kcal"
    
    // Action buttons in header
    this.mealActions = mealItem.locator('.meal-actions');
    this.addFoodToMealButton = mealItem.locator('.btn-add-food-to-meal');
    this.addSavedMealButton = mealItem.locator('.btn-add-meal-to-meal');
    this.editMealButton = mealItem.locator('.btn-edit-meal');
    
    // Meal content
    this.mealFoods = mealItem.locator('.meal-foods');
    this.foodItems = mealItem.locator('.food-item');
    this.emptyMealMessage = mealItem.locator('.empty-meal-message');
    
    // Footer buttons
    this.mealFooter = mealItem.locator('.meal-footer');
    this.deleteMealButton = mealItem.locator('.btn-delete-meal-footer');
    this.addMealBelowButton = mealItem.locator('.btn-add-meal-below');
    this.saveMealTemplateButton = mealItem.locator('.btn-save-meal');
  }

  async toggleExpanded() {
    await this.mealHeader.click();
  }

  async isExpanded() {
    return !(await this.mealItem.evaluate((el) => el.classList.contains('collapsed')));
  }

  async addFoodToMeal() {
    await this.addFoodToMealButton.click();
  }

  async addSavedMeal() {
    await this.addSavedMealButton.click();
  }

  async editMeal() {
    await this.editMealButton.click();
  }

  async deleteMeal() {
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    await this.deleteMealButton.click();
  }

  async addMealBelow() {
    await this.addMealBelowButton.click();
  }

  async saveMealTemplate() {
    await this.saveMealTemplateButton.click();
  }

  async getMealName() {
    const titleText = await this.mealTitle.textContent();
    // Extract meal name from "MealName - XXX kcal" format
    return titleText?.split(' - ')[0] || '';
  }

  async getTotalCalories() {
    const titleText = await this.mealTitle.textContent();
    // Extract calories from "MealName - XXX kcal" format
    const caloriesMatch = titleText?.match(/(\d+) kcal/);
    return caloriesMatch ? parseInt(caloriesMatch[1]) : 0;
  }

  async getFoodCount() {
    return await this.foodItems.count();
  }

  async getFoodNames() {
    return await this.foodItems.locator('.food-name').allTextContents();
  }

  async isEmpty() {
    return await this.emptyMealMessage.isVisible();
  }
}

export class DayPage extends BasePage {
  readonly navbar: NavbarComponent;
  
  // Page elements
  readonly pageTitle: Locator;
  readonly dateNavigation: Locator;
  readonly prevDayButton: Locator;
  readonly nextDayButton: Locator;
  readonly currentDateDisplay: Locator;
  
  // Summary panel
  readonly summaryPanel: Locator;
  readonly totalKcal: Locator;
  readonly goalKcal: Locator;
  readonly remainingKcal: Locator;
  readonly deficitKcal: Locator;
  
  // Meals section
  readonly dayList: Locator;
  readonly mealItems: Locator;
  
  // Add buttons
  readonly addNotesPrompt: Locator;
  readonly addExercisePrompt: Locator;
  readonly addNotesButton: Locator;
  readonly addExerciseButton: Locator;
  
  // Notes section
  readonly notesSection: Locator;
  readonly notesItem: Locator;
  readonly notesDisplay: Locator;
  readonly notesEditForm: Locator;
  readonly notesTextarea: Locator;
  readonly saveNotesButton: Locator;
  readonly cancelNotesButton: Locator;
  
  // Exercise section
  readonly exerciseSection: Locator;
  readonly exerciseItem: Locator;
  readonly exerciseList: Locator;
  readonly exerciseForm: Locator;
  readonly exerciseTypeSelect: Locator;
  readonly exerciseKcalInput: Locator;
  readonly saveExerciseButton: Locator;
  readonly cancelExerciseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = new NavbarComponent(page);
    
    // Page elements
    this.pageTitle = page.locator('h1');
    this.dateNavigation = page.locator('.date-navigation');
    this.prevDayButton = page.locator('#prevDayBtn');
    this.nextDayButton = page.locator('#nextDayBtn');
    this.currentDateDisplay = page.locator('#dateDisplay');
    
    // Summary panel
    this.summaryPanel = page.locator('.summary-panel');
    this.totalKcal = page.locator('#totalKcal');
    this.goalKcal = page.locator('#goalKcal');
    this.remainingKcal = page.locator('#remainingKcal');
    this.deficitKcal = page.locator('#deficitKcal');
    
    // Meals section
    this.dayList = page.locator('#dayList');
    this.mealItems = page.locator('.meal-item');
    
    // Add buttons
    this.addNotesPrompt = page.locator('#addNotesPrompt');
    this.addExercisePrompt = page.locator('#addExercisePrompt');
    this.addNotesButton = page.locator('.btn-add-notes');
    this.addExerciseButton = page.locator('.btn-add-exercise');
    
    // Notes section
    this.notesSection = page.locator('.notes-section');
    this.notesItem = page.locator('#notesItem');
    this.notesDisplay = page.locator('#notesDisplay');
    this.notesEditForm = page.locator('#notesEditForm');
    this.notesTextarea = page.locator('#notesTextarea');
    this.saveNotesButton = this.notesEditForm.locator('.btn-primary');
    this.cancelNotesButton = this.notesEditForm.locator('.btn-secondary');
    
    // Exercise section
    this.exerciseSection = page.locator('#exerciseSection');
    this.exerciseItem = page.locator('#exerciseItem');
    this.exerciseList = page.locator('#exerciseList');
    this.exerciseForm = page.locator('#exerciseForm');
    this.exerciseTypeSelect = page.locator('#exerciseType');
    this.exerciseKcalInput = page.locator('#exerciseKcal');
    this.saveExerciseButton = this.exerciseForm.locator('.btn-primary');
    this.cancelExerciseButton = this.exerciseForm.locator('.btn-secondary');
  }

  async goto() {
    await super.goto('/day.html');
  }

  async gotoToday() {
    await super.goto('/day.html?day=today');
  }

  async navigateToPreviousDay() {
    await this.prevDayButton.click();
  }

  async navigateToNextDay() {
    await this.nextDayButton.click();
  }

  async getTotalCalories() {
    return await this.totalKcal.textContent();
  }

  async getGoalCalories() {
    return await this.goalKcal.textContent();
  }

  async getRemainingCalories() {
    return await this.remainingKcal.textContent();
  }

  async getDeficitCalories() {
    return await this.deficitKcal.textContent();
  }

  async addNotes(notes: string) {
    await this.addNotesButton.click();
    await this.notesTextarea.waitFor({ state: 'visible' });
    await this.notesTextarea.fill(notes);
    await this.saveNotesButton.click();
    await this.notesEditForm.waitFor({ state: 'hidden' });
  }

  async addExercise(type: string, kcal: string) {
    await this.addExerciseButton.click();
    await this.exerciseForm.waitFor({ state: 'visible' });
    await this.exerciseTypeSelect.selectOption(type);
    await this.exerciseKcalInput.fill(kcal);
    await this.saveExerciseButton.click();
    await this.exerciseForm.waitFor({ state: 'hidden' });
  }

  async getMealCount() {
    return await this.mealItems.count();
  }

  async getCurrentDate() {
    return await this.currentDateDisplay.textContent();
  }

  async getMealItems(): Promise<MealItemComponent[]> {
    const mealItemsCount = await this.mealItems.count();
    const mealComponents: MealItemComponent[] = [];
    
    for (let i = 0; i < mealItemsCount; i++) {
      const mealItem = this.mealItems.nth(i);
      await mealItem.waitFor({ state: 'visible' });
      mealComponents.push(new MealItemComponent(this.page, mealItem));
    }
    
    return mealComponents;
  }

  async getMealItem(index: number): Promise<MealItemComponent> {
    const mealItem = this.mealItems.nth(index);
    await mealItem.waitFor({ state: 'visible' });
    return new MealItemComponent(this.page, mealItem);
  }

  async getMealItemByName(mealName: string): Promise<MealItemComponent> {
    const mealItem = this.mealItems.filter({ has: this.page.locator('.meal-title', { hasText: mealName }) });
    await mealItem.waitFor({ state: 'visible' });
    return new MealItemComponent(this.page, mealItem);
  }
}
