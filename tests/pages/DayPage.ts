import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavbarComponent } from './NavbarComponent';

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
}
