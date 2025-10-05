export interface FoodItem {
  title: string;
  brand?: string; // Optional brand field
  kcal: number;
  weight: number; // Weight in grams
  quantity?: number; // Optional quantity multiplier
  quantity_type?: string; // Optional quantity type name
}

export interface Quantity {
  name: string;
  weight: number;
}

export interface Food {
  _id?: any; // MongoDB ObjectId
  name: string;
  brand?: string; // Optional brand field
  kcal_per_100g: number;
  is_ingredient: boolean;
  quantities: Quantity[];
}

export interface MealItem {
  title: string;
  foods: FoodItem[];
}

export interface Meal {
  _id?: any; // MongoDB ObjectId
  name: string;
  foods: FoodItem[];
  total_kcal: number;
  date_created: Date;
  date_last_used: Date;
}

export interface Day {
  _id?: any; // MongoDB ObjectId
  yyyymmdd: number;
  meals: MealItem[];
}
