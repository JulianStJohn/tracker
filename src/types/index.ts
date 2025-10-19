export interface FoodItem {
  title: string;
  kcal: number;
}

export interface Quantity {
  name: string;
  weight: number;
}

export interface Food {
  _id?: any; // MongoDB ObjectId
  name: string;
  brand?: string; // Optional brand field
  barcode?: string; // Optional barcode field
  kcal_per_100g: number;
  is_ingredient: boolean;
  quantities: Quantity[];
}

export interface Meal {
  title: string;
  foods: FoodItem[];
}

export interface Day {
  _id?: any; // MongoDB ObjectId
  yyyymmdd: number;
  meals: Meal[];
}
