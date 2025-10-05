import { MongoClient, Db, Collection, Document, CreateIndexesOptions } from "mongodb";
import "dotenv/config";
import * as config from "./config.js"

// Type definitions for the day collection
export interface Food {
  title: string;
  kcal: number;
}

export interface Meal {
  title: string;
  foods: Food[];
}

export interface Day {
  _id?: any; // MongoDB ObjectId
  yyyymmdd: number;
  meals: Meal[];
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
                  kcal: { bsonType: "int", description: "Calories (required)" }
                }
              }
            }
          }
        }
      }
    } 
  }
}

export class MongoStore {

  private constructor(
    private client: MongoClient,
    private db: Db,
    private _days: Collection<Day>
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

    console.log(`Connected to MongoDB at ${config.MONGO_URI}, DB '${config.DB_NAME}'.`);
    return new MongoStore(client, db, days);
  }

  get database(): Db { return this.db; }
  get days(): Collection<Day> { return this._days; }

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

  async addMealToDay(yyyymmdd: number, meal: Meal): Promise<Day | null> {
    const result = await this._days.findOneAndUpdate(
      { yyyymmdd },
      { $push: { meals: meal } },
      { upsert: true, returnDocument: 'after' }
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

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}
