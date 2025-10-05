import { MongoClient, Db, Collection, Document, CreateIndexesOptions } from "mongodb";
import "dotenv/config";
import * as config from "./config.js"
import { Food, FoodItem, MealItem, Meal, Day } from "./types/collections.js"

// Helper function to create default empty meals
function createDefaultMeals(): MealItem[] {
  return [
    { title: "breakfast", foods: [] },
    { title: "lunch", foods: [] },
    { title: "dinner", foods: [] }
  ];
}

type CollectionDefinition = { 
    required_fields: string[]; 
    properties: Record<string, any>
}

const collectionDefinitions: Record<string, CollectionDefinition> = {
  "day" : {
    required_fields: ["yyyymmdd", "meals"],
    properties: {
      _id: { bsonType: "objectId" },      
      yyyymmdd: { bsonType: "int", description: "Date in yyyymmdd format (required)" },
      meals: { 
        bsonType: "array", 
        description: "Array of meals (required)",
        items: {
          bsonType: "object",
          required: ["title", "foods"],
          properties: {
            title: { bsonType: "string", description: "Meal title (required)" },
            foods: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["title", "kcal"],
                properties: {
                  title: { bsonType: "string", description: "Food title (required)" },
                  kcal: { bsonType: ["int", "double"], description: "Calories (required)" }
                }
              }
            }
          }
        }
      }
    } 
  },
  "food" : {
    required_fields: ["name", "kcal_per_100g", "is_ingredient"],
    properties: {
      _id: { bsonType: "objectId" },      
      name: { bsonType: "string", description: "Food name (required)" },
      brand: { bsonType: "string", description: "Food brand (optional)" },
      kcal_per_100g: { bsonType: ["int", "double"], description: "Calories per 100g (required)" },
      is_ingredient: { bsonType: "bool", description: "Whether this is an ingredient (required)" },
      quantities: {
        bsonType: "array",
        description: "Array of quantity options (optional)",
        items: {
          bsonType: "object",
          required: ["name", "weight"],
          properties: {
            name: { bsonType: "string", description: "Quantity name (required)" },
            weight: { bsonType: ["int", "double"], description: "Weight in grams (required)" }
          }
        }
      }
    }
  },
  "meals" : {
    required_fields: ["name", "foods", "total_kcal", "date_created", "date_last_used"],
    properties: {
      _id: { bsonType: "objectId" },      
      name: { bsonType: "string", description: "Meal name (required)" },
      foods: {
        bsonType: "array",
        description: "Array of food items (required)",
        items: {
          bsonType: "object",
          required: ["title", "kcal", "weight"],
          properties: {
            title: { bsonType: "string", description: "Food title (required)" },
            kcal: { bsonType: ["int", "double"], description: "Calories (required)" },
            weight: { bsonType: ["int", "double"], description: "Weight in grams (required)" }
          }
        }
      },
      total_kcal: { bsonType: ["int", "double"], description: "Total calories for the meal (required)" },
      date_created: { bsonType: "date", description: "Date meal was created (required)" },
      date_last_used: { bsonType: "date", description: "Date meal was last used (required)" }
    }
  }
}

export class MongoStore {

  private constructor(
    private client: MongoClient,
    private db: Db,
    private _days: Collection<Day>,
    private _foods: Collection<Food>,
    private _meals: Collection<Meal>
  ) {}

  // ---- Startup (connect + ensure collection) ----
  static async init() {
    const client = new MongoClient(config.MONGO_URI, {
      // tune as you like:
      serverSelectionTimeoutMS: 2000
    });
    try { 
      await client.connect(); 
    } catch(e) { 
      console.log(`Error connecting to MongoDB:${config.MONGO_URI}`) 
      console.log("Shutting down"); 
      process.exit();
    }
    const db = client.db(config.DB_NAME);

    // Create collection with validator if it doesn't exist
    const collectionInfo = await db.listCollections().toArray()
    const collectionNames = collectionInfo.map((c) => { return c.name});
    console.log(`Existing collections: ${collectionNames.join(",")}`)
    
    for (const collectionName in collectionDefinitions) {
      if (!collectionNames.includes(collectionName)) { 
        console.log(`Creating collection: ${collectionName}`)
        await MongoStore.createCollection(db, collectionName) 
      } else {
        console.log(`Updating validation for existing collection: ${collectionName}`)
        await MongoStore.updateCollectionValidation(db, collectionName) 
      }
    }

    async function ensureIndexIfMissing<TSchema extends Document>(
      col: Collection<TSchema>,
      key: Record<string, 1 | -1>,
      opts: CreateIndexesOptions & { unique?: boolean; name?: string } = {}
    ) {
      const existing = await col.indexes(); // ok: returns Document[]
      const hasKey = existing.some(i => JSON.stringify(i.key) === JSON.stringify(key));
      if (hasKey) {
        if (opts.unique && !existing.find(i => JSON.stringify(i.key) === JSON.stringify(key))?.unique) {
          console.warn(`[indexes] ${col.collectionName} has ${JSON.stringify(key)} but not unique`);
        }
        return;
      }
      try {
        await col.createIndex(key, opts);
      } catch (e: any) {
        if (e?.code === 85) return; // IndexOptionsConflict: already exists with different name/options
        throw e;
      }
    }
    
    // Create the day collection and ensure unique index on yyyymmdd
    const days = db.collection<Day>("day");
    await ensureIndexIfMissing(days, { yyyymmdd: 1 }, { unique: true, name: 'unique_yyyymmdd' });

    // Create the food collection and ensure unique index on name
    const foods = db.collection<Food>("food");
    await ensureIndexIfMissing(foods, { name: 1 }, { unique: true, name: 'unique_food_name' });

    // Create the meals collection and ensure unique index on name
    const meals = db.collection<Meal>("meals");
    await ensureIndexIfMissing(meals, { name: 1 }, { unique: true, name: 'unique_meal_name' });

    console.log(`Connected to MongoDB at ${config.MONGO_URI}, DB '${config.DB_NAME}'.`);
    return new MongoStore(client, db, days, foods, meals);
  }

  get database(): Db { return this.db; }
  get days(): Collection<Day> { return this._days; }
  get foods(): Collection<Food> { return this._foods; }
  get meals(): Collection<Meal> { return this._meals; }

  static async createCollection(db: Db, collection: string) {
    await db.createCollection(collection, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: collectionDefinitions[collection].required_fields,
          additionalProperties: false,
          properties: collectionDefinitions[collection].properties
        }
      }
    });
  }

  static async updateCollectionValidation(db: Db, collection: string) {
    try {
      await db.command({
        collMod: collection,
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: collectionDefinitions[collection].required_fields,
            additionalProperties: false,
            properties: collectionDefinitions[collection].properties
          }
        }
      });
    } catch (e) {
      // collMod fails on some older deployments without erroring the app; safe to ignore/log
      console.warn("collMod failed or not supported; continuing.", e);
    }
  }

  // ---- Day CRUD operations ----
  
  async getDayByDate(yyyymmdd: number): Promise<Day | null> {
    return this._days.findOne({ yyyymmdd });
  }

  async createOrUpdateDay(day: Omit<Day, '_id'>): Promise<Day> {
    const result = await this._days.findOneAndUpdate(
      { yyyymmdd: day.yyyymmdd },
      { $set: day },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }

  async addMealToDay(yyyymmdd: number, meal: MealItem): Promise<Day | null> {
    // First check if day exists
    let day = await this._days.findOne({ yyyymmdd });
    
    if (!day) {
      // Create new day with default meals first
      const newDay = {
        yyyymmdd,
        meals: createDefaultMeals()
      };
      await this._days.insertOne(newDay);
    }
    
    // Now add the meal
    const result = await this._days.findOneAndUpdate(
      { yyyymmdd },
      { $push: { meals: meal } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async addFoodToMeal(yyyymmdd: number, mealTitle: string, food: Food): Promise<Day | null> {
    const result = await this._days.findOneAndUpdate(
      { 
        yyyymmdd,
        "meals.title": mealTitle 
      },
      { $push: { "meals.$.foods": food } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async getAllDays(): Promise<Day[]> {
    return this._days.find({}).sort({ yyyymmdd: -1 }).toArray();
  }

  async deleteDay(yyyymmdd: number): Promise<boolean> {
    const result = await this._days.deleteOne({ yyyymmdd });
    return result.deletedCount > 0;
  }

  // ---- Food CRUD operations ----
  
  async createFood(food: Omit<Food, '_id'>): Promise<Food> {
    const result = await this._foods.insertOne(food);
    const newFood = await this._foods.findOne({ _id: result.insertedId });
    return newFood!;
  }

  async getFoodByName(name: string): Promise<Food | null> {
    return this._foods.findOne({ name });
  }

  async getAllFoods(): Promise<Food[]> {
    return this._foods.find({}).sort({ name: 1 }).toArray();
  }

  async getFoodsByIngredientStatus(is_ingredient: boolean): Promise<Food[]> {
    return this._foods.find({ is_ingredient }).sort({ name: 1 }).toArray();
  }

  async updateFood(name: string, updates: Partial<Omit<Food, '_id' | 'name'>>): Promise<Food | null> {
    const result = await this._foods.findOneAndUpdate(
      { name },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result;
  }

  async deleteFood(name: string): Promise<boolean> {
    const result = await this._foods.deleteOne({ name });
    return result.deletedCount > 0;
  }

  // ---- Meal CRUD operations ----
  
  async createMeal(meal: Omit<Meal, '_id'>): Promise<Meal> {
    const result = await this._meals.insertOne(meal);
    const newMeal = await this._meals.findOne({ _id: result.insertedId });
    return newMeal!;
  }

  async getMealByName(name: string): Promise<Meal | null> {
    return this._meals.findOne({ name });
  }

  async getAllMeals(): Promise<Meal[]> {
    return this._meals.find({}).sort({ date_last_used: -1 }).toArray();
  }

  async updateMeal(name: string, updates: Partial<Omit<Meal, '_id' | 'name'>>): Promise<Meal | null> {
    const result = await this._meals.findOneAndUpdate(
      { name },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result;
  }

  async updateMealLastUsed(name: string): Promise<Meal | null> {
    const result = await this._meals.findOneAndUpdate(
      { name },
      { $set: { date_last_used: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async deleteMeal(name: string): Promise<boolean> {
    const result = await this._meals.deleteOne({ name });
    return result.deletedCount > 0;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}
